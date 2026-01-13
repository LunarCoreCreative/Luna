// Placeholder - será implementado na Fase 2
export const AlunosTab = ({ userId, students, onRefresh }) => {
    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Gerenciamento de Alunos</h2>
            <p className="text-gray-400">Em desenvolvimento...</p>
            {students && students.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                    {students.length} aluno(s) vinculado(s)
                </p>
            )}
        </div>
    );
};
