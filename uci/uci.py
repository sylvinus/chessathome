#!/usr/bin/env python
# encoding: utf-8

import sys
import os
import threading
import Queue
import time,datetime,re
import urllib2,urllib,json




class apiClient(threading.Thread):
  def __init__ (self, host, port, q):
    threading.Thread.__init__(self)
    self.host=host
    self.port=port
    self.q=q
    self.daemon=True
    
  def run(self):
    while True:
      cmd = self.q.get()
      
      #self.q.put(self.num)

def main(host,port):

  sys.stdout.write("Chess@home engine\n")
  
  
  
  q = Queue.Queue()
  api = apiClient(host,port,q)
  api.start()
  
  pos = "startpos"
  moves = []
  active=True
  while active:
    line = sys.stdin.readline().replace("\n","")
    
    log = open(os.path.join(os.path.dirname(__file__),"log.txt"),"a")
    log.write("[%s] <= %s\n" % (datetime.datetime.now(),line))
    log.close()
    
    cmd = line.split(" ")[0]
    
    
    if line=="uci":
      sys.stdout.write("id name Chess@home (%s:%s)\n" % (host,port))
      sys.stdout.write("id author Joshfire team\n")
      #todo options
      sys.stdout.write("uciok\n")
    
    elif line=="isready":
      sys.stdout.write("readyok\n")
    
    elif cmd=="position":
      m = re.match("position (.*?) moves (.*)",line)
      if m:
        pos = m.group(1)
        moves = m.group(2).strip().split(" ")
      else:
        pos=line[9:]
        moves=[]
      
    elif cmd=="go":
      #ignore options for now
      resolved = json.loads(urllib2.urlopen("http://%s:%s/api/resolve?fen=%s&moves=%s" % (host,port,urllib.quote(pos),urllib.quote(" ".join(moves)))).read())
      
      bestmove = json.loads(urllib2.urlopen("http://%s:%s/api/bestmove?fen=%s&timeout=%s" % (host,port,urllib.quote(resolved["fen"]),4000)).read())
      
      sys.stdout.write("bestmove %s\n" % bestmove["move"])
      
    elif cmd=="quit":
      active=False
    
    sys.stdout.flush()
    
  log.close()

if __name__ == '__main__':
  main(host="chessathome.org",port=80)

