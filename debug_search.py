import sys
import os

# Adds server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

from tools import web_search

def test():
    print("Testing web_search...")
    # Attempt a simple query
    result = web_search("Python 3.14 new features")
    print(f"Result: {result}")

if __name__ == "__main__":
    test()
