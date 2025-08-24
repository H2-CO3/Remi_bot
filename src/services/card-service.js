import { query } from '../../config/database.js';

export class CardService {
    
    /**
     * Récupérer toutes les cartes avec pagination
     */
    static async getAllCards(page = 1, limit = 20, search = '') {
        try {
            const offset = (page - 1) * limit;
            
            let whereClause = '';
            let params = [];
            
            if (search) {
                whereClause = 'WHERE name LIKE ? OR reference LIKE ?';
                params = [`%${search}%`, `%${search}%`];
            }
            
            // Récupérer les cartes avec pagination
            const cards = await query(
                `SELECT id, name, reference, max_price, active, created_at, updated_at 
                 FROM card_references 
                 ${whereClause} 
                 ORDER BY created_at DESC 
                 LIMIT ? OFFSET ?`,
                [...params, limit, offset]
            );
            
            // Compter le total pour la pagination
            const countResult = await query(
                `SELECT COUNT(*) as total FROM card_references ${whereClause}`,
                params
            );
            
            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);
            
            return {
                cards,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            console.error('Get cards error:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer une carte par ID
     */
    static async getCardById(id) {
        try {
            const cards = await query(
                'SELECT * FROM card_references WHERE id = ?',
                [id]
            );
            
            return cards.length > 0 ? cards[0] : null;
        } catch (error) {
            console.error('Get card by ID error:', error);
            throw error;
        }
    }
    
    /**
     * Créer une nouvelle carte
     */
    static async createCard(cardData) {
        try {
            const { name, reference, max_price, active = true } = cardData;
            
            // Validation
            if (!name || !reference || !max_price) {
                throw new Error('Nom, référence et prix maximum sont requis');
            }
            
            if (max_price <= 0) {
                throw new Error('Le prix maximum doit être supérieur à 0');
            }
            
            const result = await query(
                'INSERT INTO card_references (name, reference, max_price, active) VALUES (?, ?, ?, ?)',
                [name, reference, parseFloat(max_price), active]
            );
            
            return {
                id: result.insertId,
                name,
                reference,
                max_price: parseFloat(max_price),
                active
            };
        } catch (error) {
            console.error('Create card error:', error);
            throw error;
        }
    }
    
    /**
     * Mettre à jour une carte
     */
    static async updateCard(id, cardData) {
        try {
            const { name, reference, max_price, active } = cardData;
            
            // Vérifier que la carte existe
            const existingCard = await this.getCardById(id);
            if (!existingCard) {
                throw new Error('Carte non trouvée');
            }
            
            // Validation
            if (max_price !== undefined && max_price <= 0) {
                throw new Error('Le prix maximum doit être supérieur à 0');
            }
            
            await query(
                `UPDATE card_references 
                 SET name = COALESCE(?, name), 
                     reference = COALESCE(?, reference), 
                     max_price = COALESCE(?, max_price), 
                     active = COALESCE(?, active),
                     updated_at = NOW()
                 WHERE id = ?`,
                [name, reference, max_price ? parseFloat(max_price) : null, active, id]
            );
            
            return await this.getCardById(id);
        } catch (error) {
            console.error('Update card error:', error);
            throw error;
        }
    }
    
    /**
     * Supprimer une carte
     */
    static async deleteCard(id) {
        try {
            // Vérifier que la carte existe
            const existingCard = await this.getCardById(id);
            if (!existingCard) {
                throw new Error('Carte non trouvée');
            }
            
            // Supprimer les alertes associées en premier (CASCADE devrait le faire automatiquement)
            await query('DELETE FROM sent_alerts WHERE card_reference_id = ?', [id]);
            
            // Supprimer la carte
            await query('DELETE FROM card_references WHERE id = ?', [id]);
            
            return true;
        } catch (error) {
            console.error('Delete card error:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer toutes les cartes actives pour le scraping
     */
    static async getActiveCards() {
        try {
            return await query(
                'SELECT id, name, reference, max_price FROM card_references WHERE active = TRUE ORDER BY name'
            );
        } catch (error) {
            console.error('Get active cards error:', error);
            throw error;
        }
    }
    
    /**
     * Activer/Désactiver une carte
     */
    static async toggleCardStatus(id) {
        try {
            const card = await this.getCardById(id);
            if (!card) {
                throw new Error('Carte non trouvée');
            }
            
            const newStatus = !card.active;
            await query(
                'UPDATE card_references SET active = ?, updated_at = NOW() WHERE id = ?',
                [newStatus, id]
            );
            
            return newStatus;
        } catch (error) {
            console.error('Toggle card status error:', error);
            throw error;
        }
    }
    
    /**
     * Récupérer les statistiques des cartes
     */
    static async getCardsStats() {
        try {
            const stats = await query(`
                SELECT 
                    COUNT(*) as total_cards,
                    SUM(CASE WHEN active = TRUE THEN 1 ELSE 0 END) as active_cards,
                    AVG(max_price) as avg_max_price,
                    MIN(max_price) as min_max_price,
                    MAX(max_price) as max_max_price
                FROM card_references
            `);
            
            const result = stats[0];
            
            // Gérer les valeurs NULL quand il n'y a pas de cartes
            return {
                total_cards: result.total_cards || 0,
                active_cards: result.active_cards || 0,
                avg_max_price: result.avg_max_price || 0,
                min_max_price: result.min_max_price || 0,
                max_max_price: result.max_max_price || 0
            };
        } catch (error) {
            console.error('Get cards stats error:', error);
            throw error;
        }
    }
}