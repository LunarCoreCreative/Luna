import sys
import os
import requests
from bs4 import BeautifulSoup

def test_bing_scrape():
    print("Testing Bing Scrape...")
    query = "Python 3.14 new features"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        url = f"https://www.bing.com/search?q={query}"
        res = requests.get(url, headers=headers, timeout=10)
        print(f"Status Code: {res.status_code}")
        
        soup = BeautifulSoup(res.text, "html.parser")
        results = []
        for item in soup.find_all("li", class_="b_algo"):
            title_tag = item.find("h2")
            link_tag = item.find("a")
            desc_tag = item.find("p")
            
            if title_tag and link_tag:
                title = title_tag.get_text()
                link = link_tag["href"]
                desc = desc_tag.get_text() if desc_tag else "Sem descrição"
                results.append(f"TITULO: {title}\nLINK: {link}\nRESUMO: {desc}")
                
        print(f"Results Found: {len(results)}")
        print(f"First result: {results[0] if results else 'None'}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_bing_scrape()
