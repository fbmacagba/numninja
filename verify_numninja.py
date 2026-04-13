import tkinter as tk
from numninja import ResponsiveNumberGuessingGame

def test_init():
    print("Testing initialization...")
    root = tk.Tk()
    try:
        app = ResponsiveNumberGuessingGame(root)
        print("Initialization successful!")
    except Exception as e:
        print(f"Initialization failed: {e}")
        return False
    finally:
        root.destroy()
    return True

if __name__ == "__main__":
    if test_init():
        print("Basic verification passed.")
    else:
        print("Basic verification failed.")
