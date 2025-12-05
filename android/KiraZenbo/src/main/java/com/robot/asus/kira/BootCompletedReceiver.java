package com.robot.asus.kira;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.core.content.ContextCompat;

public class BootCompletedReceiver extends BroadcastReceiver {

    private static final String TAG = "BootCompletedReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.i(TAG, "Boot completed, starting RobotApiService and bringing MainActivity to foreground.");

            // Start the foreground service so the robot API + HTTP/WS servers are available.
            Intent serviceIntent = new Intent(context, RobotApiService.class);
            ContextCompat.startForegroundService(context, serviceIntent);

            // Also bring up the GeckoView UI so the on-device agent is ready without manual launch.
            // Use a launcher-style MAIN intent so the task is brought to the foreground.
            Intent activityIntent = new Intent(context, MainActivity.class);
            activityIntent.setAction(Intent.ACTION_MAIN);
            activityIntent.addCategory(Intent.CATEGORY_LAUNCHER);
            activityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
            context.startActivity(activityIntent);
        }
    }
}
