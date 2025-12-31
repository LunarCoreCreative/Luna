import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import chromadb
from chromadb.utils import embedding_functions

app = Flask(__name__)
CORS(app)

# Configuração do ChromaDB persistente
base_path = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(base_path, "..", "data", "memory_db")
client = chromadb.PersistentClient(path=db_path)

# Modelo de Embedding Local (all-MiniLM-L6-v2)
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Coleção para o histórico
collection = client.get_or_create_collection(
    name="historico_memoria",
    embedding_function=sentence_transformer_ef
)

@app.route('/')
def health_check():
    return jsonify({"status": "online", "service": "luna-memory"}), 200

@app.route('/add', methods=['POST'])
def add_memory():
    data = request.json
    user_query = data.get('query')
    luna_response = data.get('response')
    
    if not user_query or not luna_response:
        return jsonify({"error": "Dados incompletos"}), 400
    
    # Armazena a interação completa como o documento
    # O ID pode ser um timestamp ou algo único
    memory_id = str(os.urandom(8).hex())
    collection.add(
        documents=[f"Shadow: {user_query}\nLuna: {luna_response}"],
        metadatas=[{"type": "chat_interaction", "user": "Shadow"}],
        ids=[memory_id]
    )
    
    return jsonify({"status": "success", "id": memory_id})

@app.route('/search', methods=['GET'])
def search_memory():
    query = request.args.get('q')
    if not query:
        return jsonify({"error": "Query vazia"}), 400
    
    results = collection.query(
        query_texts=[query],
        n_results=5
    )
    
    # Formata os resultados para injeção no prompt
    memories = results['documents'][0] if results['documents'] else []
    
    return jsonify({"memories": memories})

if __name__ == '__main__':
    print(f"Serviço de Memória iniciado. Persistência em: {db_path}")
    app.run(port=5001)
