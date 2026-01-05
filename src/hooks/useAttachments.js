import { useState, useCallback, useRef } from "react";

const MEMORY_SERVER = "http://127.0.0.1:8001";

/**
 * useAttachments - Hook para gerenciamento de anexos (imagens e documentos)
 */
export const useAttachments = (setToolStatus) => {
    const [attachments, setAttachments] = useState([]);
    const [documentAttachments, setDocumentAttachments] = useState([]);
    const fileInputRef = useRef(null);

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    setAttachments(prev => [...prev, event.target.result]);
                };
                reader.readAsDataURL(blob);
            }
        }
    }, []);

    const handleFileSelect = useCallback(async (e) => {
        const files = Array.from(e.target.files);

        for (const file of files) {
            const filename = file.name.toLowerCase();

            // Handle images
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setAttachments(prev => [...prev, event.target.result]);
                };
                reader.readAsDataURL(file);
            }
            // Handle PDF/TXT documents
            else if (filename.endsWith(".pdf") || filename.endsWith(".txt")) {
                try {
                    setToolStatus({ message: `Processando ${file.name}...`, type: 'info' });
                    const formData = new FormData();
                    formData.append("file", file);

                    const response = await fetch(`${MEMORY_SERVER}/upload`, {
                        method: "POST",
                        body: formData
                    });
                    const data = await response.json();

                    if (data.success) {
                        setDocumentAttachments(prev => [...prev, {
                            filename: data.filename,
                            content: data.content,
                            type: data.type
                        }]);
                        setToolStatus({ message: `${file.name} carregado!`, type: 'success' });
                        setTimeout(() => setToolStatus(null), 2000);
                    } else {
                        alert(`Erro ao processar ${file.name}: ${data.error}`);
                        setToolStatus(null);
                    }
                } catch (err) {
                    alert(`Erro ao enviar ${file.name}: ${err.message}`);
                    setToolStatus(null);
                }
            } else {
                alert(`Tipo de arquivo não suportado: ${file.name}. Use imagens, PDF ou TXT.`);
            }
        }
        e.target.value = null; // Reset input
    }, [setToolStatus]);

    const clearAttachments = useCallback(() => {
        setAttachments([]);
        setDocumentAttachments([]);
    }, []);

    return {
        attachments,
        documentAttachments,
        fileInputRef,
        setAttachments,
        setDocumentAttachments,
        handlePaste,
        handleFileSelect,
        clearAttachments
    };
};
