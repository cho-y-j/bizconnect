$env:JAVA_HOME = "C:\Java\jdk-17.0.13+11"
Set-Location C:\call\mobile\android
.\gradlew.bat assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a
