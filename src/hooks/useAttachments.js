import { useState, useCallback, useRef } from "react";
import { API_CONFIG } from "../config/api";
import { useModalContext } from "../contexts/ModalContext";

const MEMORY_SERVER = API_CONFIG.BASE_URL;

/**
 * useAttachments - Hook para gerenciamento de anexos (imagens e documentos)
 */
export const useAttachments = (setToolStatus) => {
    const { showAlert } = useModalContext();
    const [attachments, setAttachments] = useState([]);
    const [documentAttachments, setDocumentAttachments] = useState([]);
    const fileInputRef = useRef(null);

    // Função para redimensionar e comprimir imagens antes do upload
    const optimizeImage = (base64Str, maxWidth = 1024, quality = 0.8) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensionar mantendo aspect ratio
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Converter para JPEG comprimido
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
        });
    };

    const handlePaste = useCallback((e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const optimized = await optimizeImage(event.target.result);
                    setAttachments(prev => [...prev, optimized]);
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
                reader.onload = async (event) => {
                    const optimized = await optimizeImage(event.target.result);
                    setAttachments(prev => [...prev, optimized]);
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
                        await showAlert(`Erro ao processar ${file.name}: ${data.error}`, "Erro");
                        setToolStatus(null);
                    }
                } catch (err) {
                    await showAlert(`Erro ao enviar ${file.name}: ${err.message}`, "Erro");
                    setToolStatus(null);
                }
            } else {
                await showAlert(`Tipo de arquivo não suportado: ${file.name}. Use imagens, PDF ou TXT.`, "Tipo Não Suportado");
            }
        }
        e.target.value = null; // Reset input
    }, [setToolStatus, showAlert]);

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
