plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.aistudio.fundtracker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.aistudio.fundtracker"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    buildTypes {
        debug {
            buildConfigField("String", "INDIANAPI_KEY", "\"sk-live-o0ICvTn9KV81tb7KpzlzfOQsUMmUYAphAgIY8E46\"")
            buildConfigField("String", "NSE_RELAY_KEY", "\"ft-relay-9f4ac27e13b58d62\"")
            buildConfigField("String", "NSE_RELAY_URL", "\"https://www.nseindia.com\"")
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.ui)
    implementation(libs.androidx.ui.graphics)
    implementation(libs.androidx.ui.tooling.preview)
    implementation(libs.androidx.material3)
    
    // Room
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)
    
    // Networking
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    
    // Serialization
    implementation(libs.kotlinx.serialization.json)
}
