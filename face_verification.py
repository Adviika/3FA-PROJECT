import sys
import cv2
from deepface import DeepFace
import os
import time
import numpy as np
import threading
from queue import Queue

class CameraCapture:
    def __init__(self):
        self.frame_queue = Queue(maxsize=1)
        self.stopped = False
        
    def start(self):
        try:
            self.cap = cv2.VideoCapture(0, cv2.CAP_ANY)  
            if self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                self.cap.set(cv2.CAP_PROP_FPS, 15)
                print("Camera initialized successfully")
            else:
                raise RuntimeError("Failed to open camera")
        except Exception as e:
            print(f"Error initializing camera: {e}")
            raise
        
        threading.Thread(target=self._capture_frames, daemon=True).start()
        return self
        
    def _capture_frames(self):
        while not self.stopped:
            if not self.cap.isOpened():
                print("Camera disconnected!")
                break
                
            ret, frame = self.cap.read()
            if ret:
                while not self.frame_queue.empty():
                    try:
                        self.frame_queue.get_nowait()
                    except:
                        pass
                self.frame_queue.put(frame)
            else:
                time.sleep(0.001)
                
    def read(self):
        try:
            return True, self.frame_queue.get(timeout=1.0)
        except:
            return False, None
            
    def release(self):
        self.stopped = True
        if hasattr(self, 'cap'):
            self.cap.release()

def validate_image(image_path, debug=False):
    try:
        if isinstance(image_path, str):
            img = cv2.imread(image_path)
        else:
            img = image_path
            
        if img is None or img.size == 0 or img.shape[0] < 10 or img.shape[1] < 10:
            return False, "Invalid or empty image", []
            
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        if face_cascade.empty():
            print("Error: Face cascade not loaded")
            return False, "Face detector error", []
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        gray = clahe.apply(gray)
        
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.2,
            minNeighbors=3,
            minSize=(30, 30),
            maxSize=(300, 300)
        )
        
        if len(faces) == 0:
            return False, "No face detected", []
            
        return True, "Image validated", faces
    except Exception as e:
        print(f"Validation error: {str(e)}")
        return False, f"Validation error: {str(e)}", []

def verify_face(image_url, debug=False):
    try:
        image_path = os.path.abspath(image_url.replace("\\", "/"))
        if not os.path.exists(image_path):
            print(f"Reference image not found at {image_path}")
            return "Reference image not found"

        is_valid, message, faces = validate_image(image_path, debug)
        if not is_valid:
            print(f"Reference image validation failed: {message}")
            return "Invalid reference image"

        cap = CameraCapture().start()
        print("Please look at the camera for verification...")
        
        face_detected_frames = 0
        required_face_frames = 2
        start_time = time.time()
        max_wait_time = 30
        best_frame = None
        
        try:
            while True:
                elapsed_time = time.time() - start_time
                if elapsed_time > max_wait_time:
                    print("Face detection timed out")
                    return "Face detection timeout"

                ret, frame = cap.read()
                if not ret:
                    continue

                is_valid, message, faces = validate_image(frame, debug)
                if is_valid:
                    face_detected_frames += 1
                    best_frame = frame
                    if face_detected_frames >= required_face_frames:
                        cv2.imwrite('temp.jpg', best_frame)
                        print("Face captured successfully")
                        break
                else:
                    face_detected_frames = max(0, face_detected_frames - 1)

                if cv2.waitKey(1) & 0xFF == 27:
                    print("Verification cancelled by user")
                    return "Verification cancelled"

            cap.release()
            cv2.destroyAllWindows()
            
            if not os.path.exists('temp.jpg'):
                print("Failed to save captured image")
                return "Capture failed"
                
            try:
                result = DeepFace.verify(
                    img1_path="temp.jpg",
                    img2_path=image_path,
                    model_name="VGG-Face",
                    detector_backend="opencv",
                    distance_metric="cosine",
                    enforce_detection=False
                )
                
                if os.path.exists('temp.jpg'):
                    os.remove('temp.jpg')
                    
                return "User verified" if result["verified"] else "User verification failed"
                    
            except Exception as e:
                print(f"DeepFace verification error: {e}")
                return "Face verification failed"
                
        finally:
            cap.release()
            cv2.destroyAllWindows()
            if os.path.exists('temp.jpg'):
                os.remove('temp.jpg')
                
    except Exception as e:
        print(f"Error: {e}")
        return "Error in verification process"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py <path_to_reference_image> [--debug]")
        sys.exit(1)
        
    debug_mode = "--debug" in sys.argv
    image_url = sys.argv[1]
    result = verify_face(image_url, debug_mode)
    print(result)
