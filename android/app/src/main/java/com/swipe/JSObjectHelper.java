package com.swipe;

import com.getcapacitor.JSObject;

public class JSObjectHelper {
    public static JSObject boolResult(String key, boolean value) {
        JSObject obj = new JSObject();
        obj.put(key, value);
        return obj;
    }
}
