import { useState, useCallback } from "react";

const MEMORY_SERVER = "http://127.0.0.1:8001";

/**
 * useArtifacts - Hook para gerenciamento de artefatos e canvas
 */
export const useArtifacts = (currentChatId, persistChat) => {
    const [canvasOpen, setCanvasOpen] = useState(false);
    const [activeArtifact, setActiveArtifact] = useState(null);

    const handleSaveArtifact = useCallback(async (newContent, messages, setMessages) => {
        if (!activeArtifact) return;

        let savedArtifact = { ...activeArtifact, content: newContent };

        // Não tenta salvar artefatos temporários (streaming) via API
        const isTemporary = activeArtifact.id?.startsWith("temp_") || activeArtifact.is_streaming;

        if (!isTemporary) {
            try {
                const res = await fetch(`${MEMORY_SERVER}/artifacts/${activeArtifact.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ content: newContent })
                });
                const data = await res.json();
                if (data.success && data.artifact) {
                    savedArtifact = data.artifact;
                }
            } catch (e) {
                console.error("Failed to save artifact", e);
            }
        }

        setActiveArtifact(savedArtifact);

        setMessages(prev => {
            const newMessages = prev.map(m => {
                if (m.artifact && m.artifact.id === activeArtifact.id) {
                    return { ...m, artifact: savedArtifact };
                }
                return m;
            });
            persistChat(newMessages, currentChatId);
            return newMessages;
        });
    }, [activeArtifact, currentChatId, persistChat]);

    const handleDeleteArtifact = useCallback(async (artifactId, messages, setMessages) => {
        if (!artifactId) return;

        // Não tenta deletar artefatos temporários via API
        const isTemporary = artifactId?.startsWith("temp_");

        if (!isTemporary) {
            try {
                await fetch(`${MEMORY_SERVER}/artifacts/${artifactId}`, { method: 'DELETE' });
            } catch (err) {
                console.error("Erro ao excluir artefato:", err);
            }
        }

        setMessages(prev => {
            const newMessages = prev.map(m => {
                if (m.artifact && m.artifact.id === artifactId) {
                    return { ...m, artifact: null, content: "🗑️ *Artefato excluído*" };
                }
                return m;
            });
            persistChat(newMessages, currentChatId);
            return newMessages;
        });

        if (activeArtifact?.id === artifactId) {
            setActiveArtifact(null);
            setCanvasOpen(false);
        }
    }, [activeArtifact, currentChatId, persistChat]);

    const openArtifact = useCallback((artifact) => {
        setActiveArtifact(artifact);
        setCanvasOpen(true);
    }, []);

    return {
        canvasOpen,
        activeArtifact,
        setCanvasOpen,
        setActiveArtifact,
        handleSaveArtifact,
        handleDeleteArtifact,
        openArtifact
    };
};
