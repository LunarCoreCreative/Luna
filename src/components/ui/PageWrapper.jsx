import { motion } from 'framer-motion';

const PageWrapper = ({ children, className = '' }) => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
                duration: 0.5,
                ease: "easeInOut"
            }}
            className={`w-full ${className}`}
        >
            {children}
        </motion.div>
    );
};

export default PageWrapper;
