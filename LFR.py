import cv2
from deepface import DeepFace
import os

# Set up the camera
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

# Set camera resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Directory where images are stored
image_directory = r"C:\Users\Advika\OneDrive\Desktop\MINOR\3FA-PROJECT-main\images"

# Function to verify user against all images in the directory
def verify_user():
    ret, frame = cap.read()
    if ret:
        # Resize the captured frame to match DeepFace's input size
        frame = cv2.resize(frame, (224, 224))  # Resize to 224x224, typical for many models

        # Iterate through all images in the directory
        for image_file in os.listdir(image_directory):
            reference_image_path = os.path.join(image_directory, image_file)
            print(f"Verifying against {image_file}...")
            
            # Check if the image can be read
            reference_image = cv2.imread(reference_image_path)
            if reference_image is None:
                print(f"Warning: Could not read image {reference_image_path}. Skipping...")
                continue
            
            # Resize the reference image
            reference_image = cv2.resize(reference_image, (224, 224))  # Resize to match the input size

            try:
                # Verify using DeepFace
                result = DeepFace.verify(frame, reference_image, enforce_detection=False)  # Disable detection if it causes issues
                print(f"Verification result for {image_file}: {result}")
                
                if result['verified']:
                    print(f"User verified successfully against {image_file}!")
                    break
            except Exception as e:
                print(f"Error verifying against {image_file}: {str(e)}")
        else:
            print("User verification failed against all images.")
    else:
        print("Failed to capture image for verification.")

print("Press 'v' to verify your face. Press 'q' to quit.")

while True:
    ret, frame = cap.read()

    if ret:
        cv2.imshow("Camera Feed", frame)

        # User verification: Press 'v' to verify the user's face
        key = cv2.waitKey(1)
        if key == ord('v'):
            verify_user()  # Automatically verify against all images
        elif key == ord('q'):
            break  # Exit when 'q' is pressed

# Release the camera and close windows
cap.release()
cv2.destroyAllWindows()
