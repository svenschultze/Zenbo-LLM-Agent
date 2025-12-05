package com.robot.asus.kira;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import org.mozilla.geckoview.GeckoRuntime;
import org.mozilla.geckoview.GeckoSession;
import org.mozilla.geckoview.GeckoView;

public class MainActivity extends Activity implements GeckoSession.PermissionDelegate {

    private static final String TAG = "MainActivity";
    private static final int AUDIO_PERMISSION_REQUEST_CODE = 1;
    private static final int NOTIFICATION_PERMISSION_REQUEST_CODE = 2;

    private GeckoView mGeckoView;
    private GeckoSession mGeckoSession;
    private GeckoRuntime mGeckoRuntime;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // Request notification permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST_CODE);
            } else {
                startRobotService();
            }
        } else {
            startRobotService();
        }

        mGeckoView = findViewById(R.id.geckoview);
        mGeckoSession = new GeckoSession();

        mGeckoSession.setPermissionDelegate(this);

        mGeckoRuntime = GeckoRuntimeHolder.get(this);

        mGeckoSession.open(mGeckoRuntime);
        mGeckoView.setSession(mGeckoSession);
        mGeckoSession.loadUri("http://127.0.0.1:8787/");
    }

    private void startRobotService() {
        Intent intent = new Intent(this, RobotApiService.class);
        ContextCompat.startForegroundService(this, intent);
    }

    @Override
    public void onMediaPermissionRequest(@NonNull GeckoSession session, @NonNull String uri,
                                         GeckoSession.PermissionDelegate.MediaSource[] video, @NonNull GeckoSession.PermissionDelegate.MediaSource[] audio,
                                         @NonNull GeckoSession.PermissionDelegate.MediaCallback callback) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION_REQUEST_CODE);
        } else {
            if (audio != null && audio.length > 0) {
                callback.grant(null, audio[0]);
            } else {
                callback.reject();
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == AUDIO_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                mGeckoSession.reload();
            }
        } else if (requestCode == NOTIFICATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                startRobotService();
            }
        }
    }
}
