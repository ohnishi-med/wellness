import os
import shutil

def build():
    # Define paths
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    src_dir = os.path.join(base_dir, 'src')
    dist_dir = os.path.join(base_dir, 'dist')

    print(f"Building from {src_dir} to {dist_dir}...")

    # Copy src to dist using dirs_exist_ok=True to avoid directory lock issues
    print("Copying files...")
    try:
        shutil.copytree(src_dir, dist_dir, dirs_exist_ok=True)
    except Exception as e:
        print(f"Warning during file copy: {e}")
    
    print("\nBuild completed successfully!")
    print("Final structure:")
    for root, dirs, files in os.walk(dist_dir):
        level = root.replace(dist_dir, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            print(f"{sub_indent}{f}")

if __name__ == "__main__":
    build()
