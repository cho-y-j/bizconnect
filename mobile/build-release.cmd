@echo off
set JAVA_HOME=C:\Java\jdk-17.0.13+11
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d C:\call\mobile\android
call C:\call\mobile\android\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
