// 1. IMPORTANT: Replace <robot-ip> with the actual IP address of your robot.
const robotIp = "localhost";
const eventSourceUrl = `http://${robotIp}:8787/api/events`;

console.log(`Connecting to ${eventSourceUrl}...`);
const eventSource = new EventSource(eventSourceUrl);


// 2. Handle connection opening
eventSource.onopen = function() {
    console.log("Connection to robot's event stream opened.");
};

// 3. Handle connection errors
eventSource.onerror = function(err) {
    console.error("EventSource failed:", err);
};

// 4. Create a generic handler for all events
function handleRobotEvent(event) {
    try {
        const eventData = JSON.parse(event.data);
        console.log(`Received event '${event.type}':`, eventData);

        // Display the last event on the page
        lastEventEl.textContent = `Event Type: ${event.type}\n\n${JSON.stringify(eventData, null, 2)}`;
    } catch (e) {
        console.error("Failed to parse event data:", event.data, e);
    }
}

// 5. Listen for the specific events you defined in the service
eventSource.addEventListener("initComplete", handleRobotEvent);
eventSource.addEventListener("onStateChange", handleRobotEvent);
eventSource.addEventListener("onResult", handleRobotEvent);
eventSource.addEventListener("onSpeakComplete", handleRobotEvent);
eventSource.addEventListener("onEventUserUtterance", handleRobotEvent);
eventSource.addEventListener("onDsdResult", handleRobotEvent);
eventSource.addEventListener("onDetectFaceResult", handleRobotEvent);
// Add any other event listeners you need here...
