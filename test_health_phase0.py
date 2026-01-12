"""
Testes para Fase 0 - Luna Health
================================
Testa todas as funcionalidades implementadas na Fase 0:
- T0.1: Health Storage local (validação, locks, arquivos corrompidos)
- T0.2: Logs e debug
- T0.4: Mensagens de erro amigáveis
- T0.5: Pesquisa e adição automática de alimentos
"""

import pytest
import json
import tempfile
import shutil
import os
import time
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock

# Importar módulos a serem testados
import sys
sys.path.insert(0, str(Path(__file__).parent / "server"))

from server.health.storage import (
    add_meal,
    update_meal,
    delete_meal,
    load_meals,
    get_goals,
    update_goals,
    get_summary,
    get_user_data_dir,
    validate_meal,
    validate_meals_list,
    validate_goals,
    FileLock
)
from server.health.tools import execute_health_tool
from server.health.foods import (
    load_database,
    add_food_manually,
    search_foods,
    try_find_or_add_food
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def temp_data_dir():
    """Cria um diretório temporário para testes."""
    temp_dir = tempfile.mkdtemp()
    original_data_dir = None
    
    # Mock do DATA_DIR
    from server.health import storage
    original_data_dir = storage.DATA_DIR
    storage.DATA_DIR = Path(temp_dir) / "health"
    storage.DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    yield temp_dir
    
    # Cleanup
    shutil.rmtree(temp_dir)
    storage.DATA_DIR = original_data_dir


@pytest.fixture
def test_user_id():
    """ID de usuário para testes."""
    return "test_user_123"


# =============================================================================
# T0.1 - TESTES DE STORAGE (Validação, Locks, Arquivos Corrompidos)
# =============================================================================

class TestStorageValidation:
    """Testa validação de dados no storage."""
    
    def test_validate_meal_valid(self):
        """Testa validação de meal válido."""
        meal = {
            "id": "test-123",
            "name": "Café da manhã",
            "meal_type": "breakfast",
            "date": "2025-01-27T10:00:00",
            "calories": 350.0,
            "protein": 15.0,
            "carbs": 45.0,
            "fats": 10.0
        }
        assert validate_meal(meal) == True
    
    def test_validate_meal_missing_required_field(self):
        """Testa validação de meal sem campo obrigatório."""
        meal = {
            "id": "test-123",
            "name": "Café da manhã",
            # Falta meal_type
            "date": "2025-01-27T10:00:00"
        }
        assert validate_meal(meal) == False
    
    def test_validate_meal_invalid_type(self):
        """Testa validação de meal com tipo inválido."""
        meal = {
            "id": "test-123",
            "name": "Café da manhã",
            "meal_type": "invalid_type",  # Tipo inválido
            "date": "2025-01-27T10:00:00"
        }
        assert validate_meal(meal) == False
    
    def test_validate_goals_valid(self):
        """Testa validação de goals válido."""
        goals = {
            "daily_calories": 2000.0,
            "daily_protein": 80.0,
            "daily_carbs": 250.0,
            "daily_fats": 65.0
        }
        assert validate_goals(goals) == True
    
    def test_validate_goals_invalid_number(self):
        """Testa validação de goals com número inválido."""
        goals = {
            "daily_calories": "not_a_number"  # Deveria ser número
        }
        assert validate_goals(goals) == False


class TestStorageCorruptedFiles:
    """Testa tratamento de arquivos corrompidos."""
    
    def test_load_meals_empty_file(self, temp_data_dir, test_user_id):
        """Testa carregamento de arquivo vazio."""
        user_dir = Path(temp_data_dir) / "health" / test_user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        meals_file = user_dir / "meals.json"
        meals_file.write_text("", encoding="utf-8")
        
        meals = load_meals(test_user_id)
        assert meals == []
    
    def test_load_meals_corrupted_file(self, temp_data_dir, test_user_id):
        """Testa carregamento de arquivo corrompido."""
        user_dir = Path(temp_data_dir) / "health" / test_user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        meals_file = user_dir / "meals.json"
        meals_file.write_text("invalid json {", encoding="utf-8")
        
        meals = load_meals(test_user_id)
        assert meals == []
        # Verifica se backup foi criado
        backups = list(user_dir.glob("meals.json.corrupted.*"))
        assert len(backups) > 0
    
    def test_load_meals_invalid_structure(self, temp_data_dir, test_user_id):
        """Testa carregamento de arquivo com estrutura inválida."""
        user_dir = Path(temp_data_dir) / "health" / test_user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        meals_file = user_dir / "meals.json"
        meals_file.write_text('{"not": "a list"}', encoding="utf-8")
        
        meals = load_meals(test_user_id)
        assert meals == []
    
    def test_load_goals_empty_file(self, temp_data_dir, test_user_id):
        """Testa carregamento de goals de arquivo vazio."""
        user_dir = Path(temp_data_dir) / "health" / test_user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        goals_file = user_dir / "goals.json"
        goals_file.write_text("", encoding="utf-8")
        
        goals = get_goals(test_user_id)
        assert goals == {}


class TestStorageLocks:
    """Testa sistema de locks."""
    
    def test_file_lock_acquire_release(self, temp_data_dir):
        """Testa aquisição e liberação de lock."""
        lock_file = Path(temp_data_dir) / "test.lock"
        lock = FileLock(lock_file, timeout=1.0)
        
        with lock:
            assert lock.locked == True
            assert lock_file.exists()
        
        assert lock.locked == False
        assert not lock_file.exists()
    
    def test_file_lock_timeout(self, temp_data_dir):
        """Testa timeout de lock."""
        lock_file = Path(temp_data_dir) / "test.lock"
        lock_file.write_text("locked", encoding="utf-8")
        
        # Simula lock antigo (mais de 2x timeout)
        old_time = time.time() - 3.0
        os.utime(lock_file, (old_time, old_time))
        
        lock = FileLock(lock_file, timeout=1.0)
        with lock:
            assert lock.locked == True


class TestStorageOperations:
    """Testa operações básicas de storage."""
    
    def test_add_meal(self, temp_data_dir, test_user_id):
        """Testa adição de refeição."""
        meal = add_meal(
            user_id=test_user_id,
            name="Café da manhã",
            meal_type="breakfast",
            calories=350.0,
            protein=15.0,
            carbs=45.0,
            fats=10.0
        )
        
        assert meal["name"] == "Café da manhã"
        assert meal["meal_type"] == "breakfast"
        assert meal["calories"] == 350.0
        assert "id" in meal
        assert "date" in meal
    
    def test_load_meals(self, temp_data_dir, test_user_id):
        """Testa carregamento de refeições."""
        # Adiciona algumas refeições
        add_meal(test_user_id, "Almoço", "lunch", calories=600.0)
        add_meal(test_user_id, "Jantar", "dinner", calories=500.0)
        
        meals = load_meals(test_user_id)
        assert len(meals) == 2
    
    def test_update_meal(self, temp_data_dir, test_user_id):
        """Testa atualização de refeição."""
        meal = add_meal(test_user_id, "Lanche", "snack", calories=200.0)
        meal_id = meal["id"]
        
        updated = update_meal(
            user_id=test_user_id,
            meal_id=meal_id,
            calories=250.0
        )
        
        assert updated is not None
        assert updated["calories"] == 250.0
    
    def test_delete_meal(self, temp_data_dir, test_user_id):
        """Testa remoção de refeição."""
        meal = add_meal(test_user_id, "Teste", "breakfast")
        meal_id = meal["id"]
        
        success = delete_meal(test_user_id, meal_id)
        assert success == True
        
        meals = load_meals(test_user_id)
        assert len(meals) == 0
    
    def test_update_goals(self, temp_data_dir, test_user_id):
        """Testa atualização de metas."""
        goals = update_goals(
            user_id=test_user_id,
            daily_calories=2000.0,
            daily_protein=80.0
        )
        
        assert goals["daily_calories"] == 2000.0
        assert goals["daily_protein"] == 80.0
    
    def test_get_summary(self, temp_data_dir, test_user_id):
        """Testa resumo nutricional."""
        # Define metas
        update_goals(test_user_id, daily_calories=2000.0, daily_protein=80.0)
        
        # Adiciona refeições
        add_meal(test_user_id, "Almoço", "lunch", calories=600.0, protein=30.0)
        
        summary = get_summary(test_user_id)
        
        assert summary["total_calories"] == 600.0
        assert summary["total_protein"] == 30.0
        assert summary["remaining_calories"] == 1400.0
        assert summary["remaining_protein"] == 50.0


# =============================================================================
# T0.4 - TESTES DE MENSAGENS DE ERRO AMIGÁVEIS
# =============================================================================

@pytest.mark.asyncio
class TestFriendlyErrorMessages:
    """Testa mensagens de erro amigáveis."""
    
    async def test_add_meal_missing_required(self):
        """Testa mensagem de erro ao adicionar meal sem campos obrigatórios."""
        result = await execute_health_tool("add_meal", {
            "name": "Teste"
            # Falta meal_type
        })
        
        # Deve falhar, mas com mensagem amigável
        assert result["success"] == False
        error_msg = result.get("error", "").lower()
        # Verifica se tem mensagem amigável (pode ser sobre validação, obrigatório, necessário, etc)
        assert any(word in error_msg for word in [
            "obrigatório", "necessário", "validação", "verifique", 
            "dados", "erro", "por favor"
        ])
    
    async def test_edit_meal_not_found(self):
        """Testa mensagem de erro ao editar meal não encontrado."""
        result = await execute_health_tool("edit_meal", {
            "meal_id": "nonexistent-id-123"
        }, user_id="test_user")
        
        assert result["success"] == False
        assert "não encontrada" in result.get("error", "").lower()
        assert "❌" in result.get("error", "")  # Emoji de erro
    
    async def test_delete_meal_not_found(self):
        """Testa mensagem de erro ao deletar meal não encontrado."""
        result = await execute_health_tool("delete_meal", {
            "meal_id": "nonexistent-id-123"
        }, user_id="test_user")
        
        assert result["success"] == False
        assert "não encontrada" in result.get("error", "").lower()
        assert "❌" in result.get("error", "")
    
    async def test_search_food_empty_query(self):
        """Testa mensagem de erro ao buscar alimento sem query."""
        result = await execute_health_tool("search_food", {
            "query": ""
        })
        
        assert result["success"] == False
        assert "informe" in result.get("error", "").lower() or "por favor" in result.get("error", "").lower()
    
    async def test_list_meals_empty(self):
        """Testa mensagem amigável quando não há refeições."""
        result = await execute_health_tool("list_meals", {}, user_id="test_user_empty")
        
        assert result["success"] == True
        assert result["count"] == 0
        assert "nenhuma" in result.get("message", "").lower()
        assert "📋" in result.get("message", "")  # Emoji
    
    async def test_get_goals_empty(self):
        """Testa mensagem amigável quando não há metas."""
        result = await execute_health_tool("get_goals", {}, user_id="test_user_no_goals")
        
        assert result["success"] == True
        assert "não definiu" in result.get("message", "").lower() or "ainda não" in result.get("message", "").lower()
        assert "🎯" in result.get("message", "")  # Emoji


# =============================================================================
# T0.5 - TESTES DE PESQUISA E ADIÇÃO AUTOMÁTICA DE ALIMENTOS
# =============================================================================

class TestFoodDatabase:
    """Testa banco de dados de alimentos."""
    
    def test_add_food_manually(self):
        """Testa adição manual de alimento."""
        food = add_food_manually(
            "Teste Alimento",
            calories=100.0,
            protein=10.0,
            carbs=15.0,
            fats=5.0
        )
        
        assert food["name"] == "Teste Alimento"
        assert food["calories"] == 100.0
        assert food["protein"] == 10.0
    
    def test_search_foods(self):
        """Testa busca de alimentos."""
        # Adiciona alimento
        add_food_manually("Frango Grelhado", 165.0, 31.0, 0.0, 3.6)
        
        # Busca
        results = search_foods("frango")
        assert len(results) > 0
        assert any("frango" in r["name"].lower() for r in results)
    
    def test_search_foods_not_found(self):
        """Testa busca de alimento não encontrado."""
        results = search_foods("alimento_inexistente_xyz_123")
        # Pode retornar vazio ou resultados parciais
        assert isinstance(results, list)


@pytest.mark.asyncio
class TestAutoFoodSearch:
    """Testa pesquisa automática de alimentos."""
    
    @patch('server.health.foods.search_nutrition_online')
    async def test_try_find_or_add_food_found_in_db(self, mock_search):
        """Testa busca de alimento já no banco."""
        # Adiciona alimento ao banco
        add_food_manually("Arroz Branco", 130.0, 2.7, 28.0, 0.3)
        
        nutrition = await try_find_or_add_food("arroz branco", search_online=False)
        
        assert nutrition is not None
        assert nutrition["calories"] == 130.0
        # Não deve chamar pesquisa online
        mock_search.assert_not_called()
    
    @patch('server.health.foods.search_nutrition_online')
    async def test_try_find_or_add_food_search_online(self, mock_search):
        """Testa pesquisa online quando alimento não está no banco."""
        # Mock da pesquisa online
        mock_nutrition = {
            "name": "linguiça",
            "calories": 300.0,
            "protein": 12.0,
            "carbs": 2.0,
            "fats": 25.0
        }
        mock_search.return_value = mock_nutrition
        
        nutrition = await try_find_or_add_food("linguiça", search_online=True)
        
        assert nutrition is not None
        assert nutrition["calories"] == 300.0
        # Verifica se foi chamado (pode ter timeout como kwarg ou não)
        assert mock_search.called
        # Verifica que foi chamado com o nome do alimento
        call_args = mock_search.call_args
        assert call_args[0][0] == "linguiça"  # Primeiro argumento posicional
    
    @patch('server.health.tools.try_find_or_add_food')
    async def test_add_meal_auto_search_food(self, mock_try_find):
        """Testa adição de refeição com pesquisa automática de alimento."""
        # Mock da pesquisa automática
        mock_nutrition = {
            "calories": 300.0,
            "protein": 12.0,
            "carbs": 2.0,
            "fats": 25.0
        }
        mock_try_find.return_value = mock_nutrition
        
        result = await execute_health_tool("add_meal", {
            "name": "Comi linguiça no almoço",
            "meal_type": "lunch"
            # Sem informações nutricionais
        }, user_id="test_user")
        
        assert result["success"] == True
        assert "auto_searched" in result or "pesquisadas" in result.get("message", "").lower()
        # Verifica se tentou buscar o alimento
        mock_try_find.assert_called()


# =============================================================================
# TESTES DE INTEGRAÇÃO
# =============================================================================

@pytest.mark.asyncio
class TestIntegration:
    """Testes de integração end-to-end."""
    
    async def test_full_meal_workflow(self, temp_data_dir, test_user_id):
        """Testa fluxo completo: adicionar meal, atualizar, deletar."""
        # 1. Adiciona meal
        result1 = await execute_health_tool("add_meal", {
            "name": "Café da manhã completo",
            "meal_type": "breakfast",
            "calories": 400.0,
            "protein": 20.0
        }, user_id=test_user_id)
        
        assert result1["success"] == True
        meal_id = result1["meal"]["id"]
        
        # 2. Lista meals
        result2 = await execute_health_tool("list_meals", {}, user_id=test_user_id)
        assert result2["success"] == True
        assert result2["count"] > 0
        
        # 3. Atualiza meal
        result3 = await execute_health_tool("edit_meal", {
            "meal_id": meal_id,
            "calories": 450.0
        }, user_id=test_user_id)
        assert result3["success"] == True
        
        # 4. Obtém resumo
        result4 = await execute_health_tool("get_nutrition_summary", {}, user_id=test_user_id)
        assert result4["success"] == True
        assert result4["summary"]["total_calories"] == 450.0
        
        # 5. Deleta meal
        result5 = await execute_health_tool("delete_meal", {
            "meal_id": meal_id
        }, user_id=test_user_id)
        assert result5["success"] == True
    
    async def test_goals_workflow(self, temp_data_dir, test_user_id):
        """Testa fluxo completo de metas."""
        # 1. Atualiza metas
        result1 = await execute_health_tool("update_goals", {
            "daily_calories": 2000.0,
            "daily_protein": 80.0
        }, user_id=test_user_id)
        
        assert result1["success"] == True
        
        # 2. Obtém metas
        result2 = await execute_health_tool("get_goals", {}, user_id=test_user_id)
        assert result2["success"] == True
        assert result2["goals"]["daily_calories"] == 2000.0


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
