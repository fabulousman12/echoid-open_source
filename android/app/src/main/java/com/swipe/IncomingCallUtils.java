package com.swipe;

import android.content.Context;
import android.content.Intent;

public class IncomingCallUtils {

    public static void stopService(Context c) {
        Intent i = new Intent(c, IncomingCallService.class);
        c.stopService(i);
    }
}
