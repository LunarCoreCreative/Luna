import { createContext, useContext } from "react";
import { useModal } from "../hooks/useModal";
import { Modal } from "../components/Modal";

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
    const modal = useModal();

    return (
        <ModalContext.Provider value={modal}>
            {children}
            <Modal
                isOpen={modal.modalState.isOpen}
                type={modal.modalState.type}
                title={modal.modalState.title}
                message={modal.modalState.message}
                defaultValue={modal.modalState.defaultValue}
                onConfirm={modal.handleConfirm}
                onCancel={modal.handleCancel}
                onInput={modal.handleInput}
            />
        </ModalContext.Provider>
    );
};

export const useModalContext = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error("useModalContext deve ser usado dentro de ModalProvider");
    }
    return context;
};
