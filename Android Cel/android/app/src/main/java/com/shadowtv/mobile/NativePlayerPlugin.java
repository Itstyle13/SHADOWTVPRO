package com.shadowtv.mobile;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.media3.common.util.UnstableApi;

@UnstableApi
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
    public void resume(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.resumeVideo();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.stopVideo();
        call.resolve();
    }

    @PluginMethod
    public void setMuted(PluginCall call) {
        Boolean muted = call.getBoolean("muted", false);
        MainActivity activity = (MainActivity) getActivity();
        activity.setVideoMuted(muted);
        call.resolve();
    }

    @PluginMethod
    public void setObjectFit(PluginCall call) {
        String fit = call.getString("fit", "contain");
        MainActivity activity = (MainActivity) getActivity();
        activity.setVideoObjectFit(fit);
        call.resolve();
    }

    @PluginMethod
    public void getProgress(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.runOnUiThread(() -> {
            long[] progress = activity.getVideoProgress();
            JSObject ret = new JSObject();
            ret.put("currentTime", progress[0] / 1000.0);
            ret.put("duration", progress[1] / 1000.0);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Double time = call.getDouble("time", 0.0);
        MainActivity activity = (MainActivity) getActivity();
        activity.seekVideo((long) (time * 1000));
        call.resolve();
    }

    @PluginMethod
    public void getTracks(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        activity.runOnUiThread(() -> {
            JSObject ret = activity.getVideoTracks();
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void setTrack(PluginCall call) {
        String type = call.getString("type");
        String idStr = call.getString("id");
        
        MainActivity activity = (MainActivity) getActivity();
        if (idStr != null && idStr.contains("_")) {
            String[] parts = idStr.split("_");
            try {
                int groupIndex = Integer.parseInt(parts[0]);
                int trackIndex = Integer.parseInt(parts[1]);
                activity.setVideoTrack(type, groupIndex, trackIndex);
            } catch (Exception e) {}
        } else if (idStr != null && idStr.equals("-1")) {
            activity.setVideoTrack(type, -1, -1);
        }
        call.resolve();
    }
}
