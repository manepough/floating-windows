package com.floatlauncher;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import java.util.HashMap;
import java.util.Map;

public class FloatWindowModule extends ReactContextBaseJavaModule {

    private WindowManager windowManager;
    private Map<String, View> floatingViews = new HashMap<>();

    public FloatWindowModule(ReactApplicationContext reactContext) {
        super(reactContext);
        windowManager = (WindowManager) reactContext.getSystemService(Context.WINDOW_SERVICE);
    }

    @NonNull
    @Override
    public String getName() {
        return "FloatWindowModule";
    }

    @ReactMethod
    public void checkOverlayPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(getReactApplicationContext()));
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void launchFloating(String packageName, String appName, String colorHex, Promise promise) {
        Context context = getReactApplicationContext();

        // Check if app is installed
        PackageManager pm = context.getPackageManager();
        Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
        if (launchIntent == null) {
            promise.reject("NOT_INSTALLED", "App not installed: " + packageName);
            return;
        }

        // Check overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            promise.reject("NO_PERMISSION", "Overlay permission not granted");
            return;
        }

        // Remove old float if exists
        if (floatingViews.containsKey(packageName)) {
            try {
                windowManager.removeView(floatingViews.get(packageName));
                floatingViews.remove(packageName);
            } catch (Exception ignored) {}
        }

        // Launch the app
        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(launchIntent);

        // Create floating bubble
        createFloatingBubble(context, packageName, appName, colorHex);
        promise.resolve(true);
    }

    private void createFloatingBubble(Context context, String packageName, String appName, String colorHex) {
        // Parse color safely
        int bgColor;
        try {
            bgColor = Color.parseColor(colorHex);
        } catch (Exception e) {
            bgColor = Color.DKGRAY;
        }

        // Build bubble view
        FrameLayout bubble = new FrameLayout(context);
        bubble.setBackgroundColor(bgColor);
        bubble.setAlpha(0.9f);

        // Label inside bubble
        TextView label = new TextView(context);
        String initial = appName.length() > 0 ? String.valueOf(appName.charAt(0)).toUpperCase() : "A";
        label.setText(initial);
        label.setTextColor(Color.WHITE);
        label.setTextSize(18);
        label.setGravity(Gravity.CENTER);

        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        );
        bubble.addView(label, lp);

        // Window layout params
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            140,
            140,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = 20;
        params.y = 300;

        // Shape bubble as circle using ClipToOutline
        bubble.setClipToOutline(true);
        bubble.setOutlineProvider(android.view.ViewOutlineProvider.OVAL);
        bubble.setElevation(8f);

        // Touch drag logic
        bubble.setOnTouchListener(new View.OnTouchListener() {
            private int initX, initY;
            private float initTouchX, initTouchY;
            private long touchDownTime;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initX = params.x;
                        initY = params.y;
                        initTouchX = event.getRawX();
                        initTouchY = event.getRawY();
                        touchDownTime = System.currentTimeMillis();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initX + (int)(event.getRawX() - initTouchX);
                        params.y = initY + (int)(event.getRawY() - initTouchY);
                        windowManager.updateViewLayout(v, params);
                        return true;
                    case MotionEvent.ACTION_UP:
                        long duration = System.currentTimeMillis() - touchDownTime;
                        float dx = Math.abs(event.getRawX() - initTouchX);
                        float dy = Math.abs(event.getRawY() - initTouchY);
                        if (duration < 200 && dx < 10 && dy < 10) {
                            // Tap: bring app to front
                            Intent intent = context.getPackageManager()
                                .getLaunchIntentForPackage(packageName);
                            if (intent != null) {
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
                                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                                context.startActivity(intent);
                            }
                        }
                        return true;
                }
                return false;
            }
        });

        try {
            windowManager.addView(bubble, params);
            floatingViews.put(packageName, bubble);
        } catch (Exception e) {
            // Ignored if permission was revoked mid-session
        }
    }

    @ReactMethod
    public void closeFloating(String packageName, Promise promise) {
        View view = floatingViews.get(packageName);
        if (view != null) {
            try {
                windowManager.removeView(view);
                floatingViews.remove(packageName);
                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("ERROR", e.getMessage());
            }
        } else {
            promise.resolve(false);
        }
    }
}
