package com.shadowtv.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePlayer")
public class NativePlayerPlugin extends Plugin {

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        
        if (url == null || url.isEmpty()) {
            call.reject("Must provide a video URL");
            return;
        }

        MainActivity activity = (MainActivity) getActivity();
        activity.playVideo(url);
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void pause(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.pauseVideo();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.stopVideo();
        call.resolve();
    }
}
