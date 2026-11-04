@echo off
cd /d "%~dp0\.."
set PYTHONPATH=src
python -m humanoid_atlas serve --port 8000 > data\server.out.log 2> data\server.err.log
