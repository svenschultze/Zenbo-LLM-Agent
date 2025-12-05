package com.robot.asus.kira;

import android.util.Log;

import com.koushikdutta.async.AsyncServer;
import com.koushikdutta.async.http.WebSocket;
import com.koushikdutta.async.http.server.AsyncHttpServer;
import com.koushikdutta.async.http.server.AsyncHttpServerRequest;

import org.json.JSONObject;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Simple WebSocket-based event server using AndroidAsync.
 * Exposes a single endpoint:
 *   ws://<host>:<port>/events
 */
public class AndroidAsyncEventServer {

    private static final String TAG = "AndroidAsyncEventServer";

    private final AsyncHttpServer server = new AsyncHttpServer();
    private final Set<WebSocket> clients =
            Collections.synchronizedSet(new HashSet<WebSocket>());

    private boolean started = false;

    public void start(int port) {
        if (started) {
            Log.w(TAG, "Event server already started");
            return;
        }

        server.websocket("/events", (WebSocket webSocket, AsyncHttpServerRequest request) -> {
            Log.i(TAG, "WebSocket client connected");
            clients.add(webSocket);

            webSocket.setClosedCallback(ex -> {
                clients.remove(webSocket);
                Log.i(TAG, "WebSocket client disconnected");
            });

            webSocket.setEndCallback(ex -> {
                clients.remove(webSocket);
                Log.i(TAG, "WebSocket client connection ended");
            });
        });

        // Bind the HTTP/WebSocket server to the default AsyncServer on the given port.
        server.listen(AsyncServer.getDefault(), port);
        started = true;
        Log.i(TAG, "AndroidAsync event server started on ws://127.0.0.1:" + port + "/events");
    }

    public void stop() {
        if (!started) return;
        Log.i(TAG, "Stopping AndroidAsync event server");
        try {
            server.stop();
        } catch (Exception e) {
            Log.w(TAG, "Error stopping AsyncHttpServer", e);
        }
        clients.clear();
        started = false;
    }

    public void sendEvent(String type, JSONObject data) {
        if (!started) return;
        JSONObject payload = new JSONObject();
        try {
            payload.put("type", type);
            if (data != null) {
                payload.put("data", data);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to build event payload", e);
        }

        String text = payload.toString();
        synchronized (clients) {
            for (WebSocket ws : clients) {
                try {
                    ws.send(text);
                } catch (Exception e) {
                    Log.w(TAG, "Failed to send event over WebSocket", e);
                }
            }
        }
    }
}
