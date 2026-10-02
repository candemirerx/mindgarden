# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# --- Not Bahçesi ---------------------------------------------------------
# Capacitor köprüsü sınıf adıyla yüklenir; R8 bunları silmemeli.
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep class com.notbahcesi.app.** { *; }

# MediaPipe serializes generated protobuf messages using field-name reflection.
# R8 must preserve those fields or real model loading fails in release builds.
-keepclassmembers class * extends com.google.protobuf.GeneratedMessageLite { <fields>; }
-keep class com.google.mediapipe.tasks.genai.llminference.jni.proto.** { *; }
-keep class com.google.ai.edge.litertlm.** { *; }

# WebView köprüsü: JS'e açılan metotlar korunmalı.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google ile giriş yansıma kullanır (play-services-auth kendi kurallarını
# getirmiyor); oturum sınıfları korunur.
-keep class com.google.android.gms.** { *; }
-keep class com.google.firebase.** { *; }
-dontwarn com.google.android.gms.**

# Hata ayıklamada okunabilir iz ve serileştirme alanları.
-keepattributes Signature,*Annotation*,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable
