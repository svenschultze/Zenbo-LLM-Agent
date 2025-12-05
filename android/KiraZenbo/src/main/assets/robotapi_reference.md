# **Zenbo SDK Reference Guide**

This document provides a detailed reference for the Zenbo SDK, formatted for readability. It covers the core RobotAPI class and its associated component classes for controlling Zenbo's motion, vision, dialog, and hardware features.

## **Table of Contents**

1. [RobotAPI](https://www.google.com/search?q=%23class-robotapi)
2. [DialogSystem](https://www.google.com/search?q=%23class-dialogsystem)
3. [MotionControl](https://www.google.com/search?q=%23class-motioncontrol)
4. [VisionControl](https://www.google.com/search?q=%23class-visioncontrol)
5. [WheelLights](https://www.google.com/search?q=%23class-wheellights)
6. [Slam](https://www.google.com/search?q=%23class-slam)
7. [RobotCallback](https://www.google.com/search?q=%23class-robotcallback)
8. [RobotContacts](https://www.google.com/search?q=%23class-robotcontacts)
9. [RobotErrorCode](https://www.google.com/search?q=%23class-roboterrorcode)

## **Class RobotAPI**

com.asus.robotframework.API.RobotAPI

This API provides an interface to all robot features. It serves as the main entry point for interacting with Zenbo.

### **Fields**

| Type | Name | Description |
| :---- | :---- | :---- |
| RobotContacts | **contacts** | Provides access to robot contact information. |
| DialogSystem | **robot** | Controls speech and facial expressions. |
| MotionControl | **motion** | Controls body movement and head positioning. |
| VisionControl | **vision** | Handles face detection, person detection, and gestures. |
| WheelLights | **wheelLights** | Controls the LED lights on the wheels. |
| Slam | **slam** | Provides SLAM (Simultaneous Localization and Mapping) functions. |
| Utility | **utility** | General utility functions. |

### **Constructors**

#### **RobotAPI(android.app.Activity activity)**

Constructor with default callback.

* **Parameters:** activity \- The application activity.

#### **RobotAPI(android.app.Activity activity, RobotCallback callback)**

Constructor with a user-defined callback.

* **Parameters:**
    * activity \- The application activity.
    * callback \- Listener for RobotFramework events.

#### **RobotAPI(android.content.Context context, RobotCallback callback)**

Constructor with a user-defined callback.

* **Parameters:**
    * context \- The application context.
    * callback \- Listener for RobotFramework events.

### **Methods**

#### **int cancelCommand(int command)**

Cancel a specific robot command.

* **Parameters:** command \- The command ID defined in RobotCommand.
* **Returns:** Serial number of the command.

#### **int cancelCommandAll()**

Cancel all robot commands.

* **Returns:** Serial number of the command.

#### **int cancelCommandBySerial(int serial)**

Cancel a specific command by using its serial number.

* **Parameters:** serial \- The serial number of the command to cancel.
* **Returns:** Serial number of the command.

#### **static String getVersion()**

Get the robot API version string.

* **Returns:** API version.

#### **void release()**

Release all robot API resources.

#### **void setCallback(RobotCallback callback)**

Set the callback to receive all events from the RobotFramework. Replaces the current callback.

* **Parameters:** callback \- The new callback function.

## **Class DialogSystem**

com.asus.robotframework.API.DialogSystem

Class that can be used to make Zenbo speak and listen, and to change the facial expressions.

### **Constants**

* static int LANGUAGE\_ID\_EN\_US
* static int LANGUAGE\_ID\_ZH\_TW

### **Methods**

#### **int speak(String sentence)**

Start speaking.

* **Parameters:** sentence \- Text to speech.
* **Returns:** Serial number.

#### **int speak(String sentence, SpeakConfig config)**

Start speaking with configuration.

* **Parameters:**
    * sentence \- Text to speech.
    * config \- Configuration for the speech engine.
* **Returns:** Serial number.

#### **int speakAndListen(String sentence, SpeakConfig config)**

Start speaking and then listening. If the sentence is empty, it listens directly.

* **Parameters:**
    * sentence \- Text to speech.
    * config \- Configuration for the speech engine.
* **Returns:** Serial number.

#### **int stopSpeak()**

Stop TTS (Text-To-Speech).

* **Returns:** Serial number.

#### **int stopSpeakAndListen()**

Stop both speaking and listening.

* **Returns:** Serial number.

#### **int setExpression(RobotFace face)**

Set the robot expression.

* **Parameters:** face \- Robot face expression ID.
* **Returns:** Serial number.

#### **int setExpression(RobotFace face, String sentence)**

Make robot expression and speak.

* **Parameters:**
    * face \- Robot face expression ID.
    * sentence \- Text to speech.
* **Returns:** Serial number.

#### **int setExpression(RobotFace face, String sentence, ExpressionConfig config)**

Make robot expression and speak with configuration.

* **Parameters:**
    * face \- Robot face expression ID.
    * sentence \- Text to speech.
    * config \- Configuration for expression engine.
* **Returns:** Serial number.

#### **int queryExpressionStatus()**

Query expression status. The result is returned via RobotCallback.onResult.

* **Returns:** Serial number.

#### **int setVoiceTrigger(boolean enable)**

Set dialog system voice trigger.

* **Parameters:** enable \- Flag to enable/disable voice trigger.
* **Returns:** Serial number.

#### **int setPressOnHeadAction(boolean enable)**

Enable/disable short press to shy and long press to close app.

* **Parameters:** enable \- Flag to enable/disable.
* **Returns:** Serial number.

#### **int jumpToPlan(String domain, String plan)**

Switch dialog state to a specific plan.

* **Parameters:**
    * domain \- Domain UUID.
    * plan \- Plan ID.
* **Returns:** Serial number.

## **Class MotionControl**

com.asus.robotframework.API.MotionControl

Provides body movement and head control.

### **Nested Classes**

* **MotionControl.Direction**: Parameters for movement direction.
* **MotionControl.SpeedLevel**: Parameters for speed level.

### **Methods**

#### **int moveBody(float relativeX, float relativeY, float relativeThetaRadian)**

Move body to a new location and turn head to a new angle relative to the original pose.

* **Parameters:**
    * relativeX \- Relative distance in X (meters). Positive is forward.
    * relativeY \- Relative distance in Y (meters). Positive is right.
    * relativeThetaRadian \- Relative rotational angle (radians).
* **Returns:** Serial number.

#### **int moveBody(float relativeX, float relativeY, float relativeThetaRadian, SpeedLevel.Body speedLevel)**

Move body with specified speed level.

* **Parameters:** speedLevel \- Speed level (L1=Slowest, L7=Fastest).

#### **int moveHead(float yawRadian, float pitchRadian, SpeedLevel.Head speedLevel)**

Turn head with specified speed level.

* **Parameters:**
    * yawRadian \- Angle in radians (-0.7853 left to 0.7853 right).
    * pitchRadian \- Angle in radians (-0.2617 down to 0.9599 up).
    * speedLevel \- Speed level (L1=Slowest, L3=Fastest).
* **Returns:** Serial number.

#### **int remoteControlBody(Direction.Body direction)**

Control body to move until STOP or stopMoving() is received.

* **Parameters:** direction \- STOP, FORWARD, BACKWARD, TURN\_LEFT, TURN\_RIGHT.
* **Returns:** Serial number.

#### **int remoteControlHead(Direction.Head direction)**

Control head to move until STOP or stopMoving() is received.

* **Parameters:** direction \- STOP, UP, DOWN, LEFT, RIGHT.
* **Returns:** Serial number.

#### **int stopMoving()**

Stop robot's movement (neck and body).

* **Returns:** Serial number.

#### **int goTo(String destination)**

Ask robot to go to a named destination on the map.

* **Parameters:** destination \- Location label recorded on the map.
* **Returns:** Serial number.

#### **int goTo(Location targetLocation, boolean locateAtTarget)**

Move from current position to target position (x, y, theta) using path-finding.

* **Parameters:**
    * targetLocation \- Target coordinate.
    * locateAtTarget \- Whether the robot will locate at target.
* **Returns:** Serial number.

## **Class VisionControl**

com.asus.robotframework.API.VisionControl

Provide visual functions such as face detection, person detection, and gesture recognition.

### **Constants**

* static int DEFAULT\_INTERVAL\_IN\_MS

### **Methods**

#### **int requestDetectFace(VisionConfig.FaceDetectConfig config)**

Request face detection. Results returned via RobotCallback.onDetectFaceResult.

* **Parameters:** config \- Configuration for face detection.
* **Returns:** Serial number.

#### **int requestDetectPerson(VisionConfig.PersonDetectConfig config)**

Request person detection. Results returned via RobotCallback.onDetectFaceResult.

* **Parameters:** config \- Configuration for person detection.
* **Returns:** Serial number.

#### **int requestDetectPerson(int intervalInMS)**

Request person detection at a specific interval. Results returned via RobotCallback.onDetectPersonResult.

* **Parameters:** intervalInMS \- Interval in milliseconds.
* **Returns:** Serial number.

#### **int cancelDetectPerson()**

Cancel the running detect person process.

* **Returns:** Serial number.

#### **int requestGesturePoint(int timeoutInMS)**

Request gesture point recognition. Results returned via RobotCallback.onGesturePoint.

* **Parameters:** timeoutInMS \- Timeout in milliseconds.
* **Returns:** Serial number.

## **Class WheelLights**

com.asus.robotframework.API.WheelLights

Control the LED lights on the robot's wheels.

### **Nested Classes**

* **WheelLights.Direction**: Marquee direction.
* **WheelLights.Lights**: Wheel lights ID.
* **WheelLights.Pattern**: Wheel lights pattern.

### **Methods**

#### **int setColor(Lights id, int active, int color)**

Set the color of wheel LEDs.

* **Parameters:**
    * id \- Wheel lights ID.
    * active \- Bitmap of selected LEDs (bit0\~bit7).
    * color \- Color value in ARGB format.
* **Returns:** Serial number.

#### **int setBrightness(Lights id, int active, int bright)**

Set the brightness of wheel LEDs.

* **Parameters:**
    * bright \- Brightness (0-55).
* **Returns:** Serial number.

#### **int startBlinking(Lights id, int active, int brightTime, int darkTime, int cycleNumber)**

Start a blinking pattern.

* **Parameters:**
    * brightTime \- On time (val \* 10ms).
    * darkTime \- Off time (val \* 10ms).
    * cycleNumber \- Number of cycles (0 \= forever).
* **Returns:** Serial number.

#### **int startBreathing(Lights id, int active, int darkToBrightTime, int brightToDarkTime, int cycleNumber)**

Start a breathing pattern.

* **Parameters:**
    * darkToBrightTime \- Time (val \* 0.5s).
    * brightToDarkTime \- Time (val \* 0.5s).
* **Returns:** Serial number.

#### **int startMarquee(Lights id, Direction direction, int colorShiftTime, int brightTime, int cycleNumber)**

Start a marquee pattern.

* **Parameters:**
    * direction \- Forward or Backward.
    * colorShiftTime \- Color shift time (val \* 10ms).
    * brightTime \- Active time between LEDs.
* **Returns:** Serial number.

#### **int turnOff(Lights id, int active)**

Stop the pattern and turn off lights.

* **Returns:** Serial number.

## **Class Slam**

com.asus.robotframework.API.Slam

Provide SLAM (Simultaneous Localization and Mapping) functions.

### **Methods**

#### **int activeLocalization()**

Ask robot to localize actively (rotate and capture key-frames).

* **Returns:** Serial number.
* **Callback:** Returns LOCATION bundle with x, y, heading, sessionID, submapID, and CONFIDENCELEVEL.

#### **int activeLocalization(double searchRadius)**

Ask robot to localize actively within a search radius.

* **Parameters:** searchRadius \- Radius to find a free point (default 3m).
* **Returns:** Serial number.

#### **int getLocation()**

Ask robot's current location.

* **Returns:** Serial number.

## **Class RobotCallback**

com.asus.robotframework.API.RobotCallback

The callback interface invoked by events from the RobotFramework.

### **Methods**

#### **void initComplete()**

Called when robot API initialization is complete.

#### **void onResult(int cmd, int serial, RobotErrorCode err\_code, Bundle result)**

Called when a robot command returns.

* **Parameters:**
    * cmd \- Command executed.
    * serial \- Serial number.
    * err\_code \- Error code.
    * result \- Result bundle.

#### **void onStateChange(int cmd, int serial, RobotErrorCode err\_code, RobotCmdState state)**

Called when command state changes in the waiting queue.

* **Parameters:** state \- INITIAL, PENDING, REJECTED, ACTIVE, ABORTED, SUCCEED.

#### **void onDetectFaceResult(List resultList)**

Called when the detect face service sends a result.

#### **void onDetectPersonResult(List resultList)**

Called when the detect person service sends a result.

#### **void onGesturePoint(GesturePointResult result)**

Called when a person points somewhere by spreading their arm.

#### **void onTrackingResult(List resultList)**

Called when the tracking service sends a result.

## **Class RobotContacts**

com.asus.robotframework.API.RobotContacts

Provides robot contacts query.

### **Nested Classes**

* **AccessFamilyData**
* **AccessRelationshipData**
* **AccessRobotData**
* **AccessRoomData**

### **Fields**

* public final AccessFamilyData family
* public final AccessRelationshipData relationship
* public final AccessRobotData robot
* public final AccessRoomData room

## **Class RobotErrorCode**

com.asus.robotframework.API.RobotErrorCode

Enum representing error codes returned by the robot operations.

### **Enum Values (Partial List)**

* NO\_ERROR
* UNKNOWN\_ERROR
* SERVICE\_FAILED
* PERMISSION\_DENIED
* QUEUE\_IS\_FULL / QUEUE\_IS\_EMPTY
* MOTION\_FAIL\_... (Various motion failures like OBSTACLE, TIMEOUT, BLOCKED)
* VISION\_... (Various vision errors like FACE\_NOT\_DETECTED, FACE\_TOO\_FAR)
* COORDINATOR\_... (Coordinator errors)
* WHEEL\_LIGHT\_... (Hardware errors)

### **Methods**

* int getCode()
* String getDescription()
* static RobotErrorCode getRobotErrorCode(int value)