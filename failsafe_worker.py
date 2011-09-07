#!/usr/bin/env python
# encoding: utf-8

import time,subprocess,datetime

while True:
  p = subprocess.Popen(["chessathome-worker"])
  print "%s worker started for 5 minutes.." % datetime.datetime.now()
  time.sleep(5*60)
  p.kill()
  print "%s stopping..." % datetime.datetime.now()
  time.sleep(2)
  p.terminate()
  