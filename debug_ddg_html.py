import requests
from bs4 import BeautifulSoup
import urllib.parse

def test_ddg_html_scrape():
    print("Testing DDG HTML Scrape...")
    query = "Python 3.14 new features"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    try:
        url = "https://html.duckduckgo.com/html/"
        data = {'q': query}
        res = requests.post(url, data=data, headers=headers, timeout=10)
        print(f"Status Code: {res.status_code}")
        
        soup = BeautifulSoup(res.text, "html.parser")
        results = []
        
        # O seletor pode variar, geralmente é .result
        for item in soup.find_all("div", class_="result"):
            title_tag = item.find("a", class_="result__a")
            snippet_tag = item.find("a", class_="result__snippet")
            
            if title_tag:
                title = title_tag.get_text(strip=True)
                link = title_tag["href"]
                desc = snippet_tag.get_text(strip=True) if snippet_tag else "Sem descrição"
                results.append(f"TITULO: {title}\nLINK: {link}\nRESUMO: {desc}")
                
        print(f"Results Found: {len(results)}")
        print(f"First result: {results[0] if results else 'None'}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_ddg_html_scrape()
