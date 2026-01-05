"""
Test Search Providers
---------------------
Tests the new web_search function with multiple providers.
"""

import sys
import os

# Add server to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

def test_web_search():
    """Test the web_search function with a real query."""
    from server.tools import web_search
    
    print("=" * 60)
    print("Testing Luna Web Search")
    print("=" * 60)
    
    query = "Python 3.14 new features"
    print(f"\nQuery: {query}\n")
    
    result = web_search(query)
    
    print(f"Success: {result['success']}")
    print(f"Source: {result.get('source', 'unknown')}")
    print(f"Error: {result.get('error', '')}")
    
    if result['success']:
        print(f"\n{'=' * 40}")
        print("RESULTS:")
        print(f"{'=' * 40}")
        # Show first 1000 chars of content
        content = result.get('content', '')
        print(content[:1000] + "..." if len(content) > 1000 else content)
        print("\n✅ TEST PASSED!")
        return True
    else:
        print("\n❌ TEST FAILED - No results from any provider")
        return False

def test_provider_fallback():
    """Test that providers fall through properly."""
    print("\n" + "=" * 60)
    print("Testing Provider Fallback Logic")
    print("=" * 60)
    
    # This is more of a smoke test - the actual fallback 
    # behavior depends on which providers are available
    from server.tools import web_search
    
    result = web_search("What is machine learning")
    
    if result['success']:
        source = result.get('source', 'unknown')
        print(f"\n✅ Search successful via: {source}")
        return True
    else:
        print("\n⚠️ All providers failed (might be rate limited)")
        return False

if __name__ == "__main__":
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    
    result1 = test_web_search()
    result2 = test_provider_fallback()
    
    print("\n" + "=" * 60)
    if result1 and result2:
        print("ALL TESTS PASSED! ✅")
    else:
        print("SOME TESTS FAILED ⚠️")
        sys.exit(1)
