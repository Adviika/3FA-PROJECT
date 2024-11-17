import cv2
import os

# Set up the camera
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

# Set camera resolution
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# Directory to save images
image_directory = r"C:\Users\Advika\OneDrive\Desktop\MINOR\3FA-PROJECT-main\images"

# Function to capture and save the image
def register_user(filename):
    ret, frame = cap.read()
    if ret:
        # Create the full path for the image
        reference_image_path = os.path.join(image_directory, f"{filename}.png")
        # Save the captured frame as the reference image
        cv2.imwrite(reference_image_path, frame)
        print(f"User registered successfully and image saved as {filename}.png.")
    else:
        print("Failed to capture image for registration.")

print("Press 'r' to register your face. Press 'q' to quit.")

while True:
    ret, frame = cap.read()

    if ret:
        cv2.imshow("Camera Feed", frame)

        # User registration: Press 'r' to register the user's face
        key = cv2.waitKey(1)
        if key == ord('r'):
            # Prompt the user for a filename
            filename = input("Enter a name for the picture (without extension): ")
            register_user(filename)
        elif key == ord('q'):
            break  # Exit when 'q' is pressed

# Release the camera and close windows
cap.release()
cv2.destroyAllWindows()
