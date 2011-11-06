# deploy file

from fabric.api import *
import sys
import os
import json
import platform
import re
import shutil
import datetime
import subprocess


import time,urllib2
sys.path.append("../joshfire-framework/build")
from joshfabric import *

packageconf = json.load(open("package.json","r"))

env.export_dir = os.path.join(os.path.dirname(__file__),"export")


def concat():
  local('mkdir -p build')
  filelist = os.listdir("ai")

  content = ""

  for cdir, dirs, filelist in os.walk("ai"):
    for filename in filelist:
      if (filename.endswith(".js")):
        file = open(cdir +'/'+ filename, "r")
        content += file.read()
        file.close()

  file = open("build/engine.js", "w")
  #file.write('"use strict";\n');
  file.write(content)
  file.close()

  local("git add build/")

def install():
  local('npm install')
  concat()

env.gameEngine="local"

def embedded():
  env.gameEngine="embedded"

def dist():
  env.gameEngine = "distributed-mongo"

def serve():
  local("CHESSATHOME_AI_ENGINE='%s' node --stack_size=8128 app.js" % env.gameEngine)

def test():
  _test("functional")

def strength():
  _test("strength")
  
def _test(dir):
  concat()
  
  ok=0
  for f in os.listdir("test/%s"%dir):
    if f[0]!="_":
      ok += subprocess.call(["cd test/ && CHESSATHOME_AI_ENGINE='%s' node runner.js %s/%s" % (env.gameEngine,dir,f)],shell=True)

  if ok>0:
    print "%s tests failed" % ok
    sys.exit(1)
  else:
    print "All tests OK"
    sys.exit(0)
    
def stest(filename=None):
  concat()
  print local("cd test/ && CHESSATHOME_AI_ENGINE='%s' node --prof runner.js %s" % (env.gameEngine,filename))

def prod():
  env.hosts = ['88.190.234.126']
  env.path = '/home/joshfire/exports/%s' % packageconf["name"]
  env.user = 'joshfire'

def export():
  local("git checkout-index -f -a --prefix=export/")
  local("cp config.json export/")

def deploy():
  "Deploys, currently in dev mode"
  env.release = time.strftime('%Y%m%d%H%M%S')
  export()
  setup_remote_environment()
  upload_tar_from_export()

  packagehaibu()
  symlink_current_release()
  restart()


#workers & redirect
def joyentdeploy():
  local("git push chessathome.no.de master")
  local("git push chessathome-worker1.no.de master")

# create a folder that will serve to publish chessathome-worker on https://github.com/joshfire/chessathome-worker
def makeworker():
  concat()
  assert os.path.isdir("../chessathome-worker/")
  local('cp worker/* ../chessathome-worker/')
  local("sed -i '' \"s/var ENGINE_PATH = '\.\.\/build\/engine\.js'/var ENGINE_PATH = '\.\/engine\.js'/\" ../chessathome-worker/cli.js")
  local('cp build/engine.js ../chessathome-worker/')

  #add exec
  r = open("../chessathome-worker/cli.js","r").read()
  w = open("../chessathome-worker/cli.js","w")
  w.write("#!/usr/bin/env node\n\n")
  w.write(r)
  w.close()

  # create chessathome-worker/package.json



  
def packagehaibu():

  # until https://github.com/nodejitsu/haibu/issues/52 is fixed
  # we install node_modules *before* haibu start
  install_remote_npm()

  # remove all dependencies from package.json
  run("""cd %s/releases/%s && cat package.json |tr "\n" " "| sed 's/"dependencies" *: *{[^}]*} *,//g' > package.json.1""" % (env.path,env.release))

  # remove any repository
  run("""cd %s/releases/%s && cat package.json.1 | sed 's/"repository" *: *{[^}]*} *,//g' > package.json.2""" % (env.path,env.release))

  # add our directory
  run("""cd %s/releases/%s && cat package.json.2 | sed 's/^{/{"repository":{"type":"local","directory":"%s"},/g' > package.json""" % (env.path,env.release,(env.path+"/releases/"+env.release).replace("/","\/")))


def restart():
  run("cd %s/releases/current ; haibu stop ; haibu clean ; haibu start" % env.path)

  #reconfigure nginx
  sudo('haibu-nginx /home/joshfire/haibu-nginx-config.js ; stop nginx ; start nginx')


