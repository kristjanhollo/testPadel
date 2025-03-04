// public/scripts/services/player-profile-service.js
import firebaseService from './firebase-service.js';

/**
 * Player Profile Service
 * Haldab mängijate profiilide, statistika ja ajaloo CRUD operatsioone
 */
class PlayerProfileService {
  constructor() {
    // Firebase'i dokumentide sufiksid alam-kollektsioonidele
    this.subcollections = {
      MATCHES: 'matches',
      TOURNAMENTS: 'tournaments',
      RATING_HISTORY: 'rating_history',
      GROUP_HISTORY: 'group_history'
    };
  }

  /**
   * Lisab mängu tulemuse mängija profiilile
   * @param {string} playerId - Mängija ID
   * @param {Object} matchData - Mängu andmed
   * @returns {Promise<string>} Uue mängu kirje ID
   */
  async addMatchToPlayer(playerId, matchData) {
    try {
      // Lisa mäng mängija alamkollektsiooni
      const matchesRef = firebaseService.getSubcollectionRef(
        'players', 
        playerId, 
        this.subcollections.MATCHES
      );
      
      // Vorminda andmed ja lisa loomisaeg
      const matchToSave = {
        ...matchData,
        date: matchData.date || new Date().toISOString(),
        created_at: firebaseService.timestamp()
      };
      
      // Lisa dokument Firebase'i
      const docRef = await firebaseService.addDocument(matchesRef, matchToSave);
      
      // Uuenda mängija statistikat
      await this.updatePlayerStats(playerId, {
        matchesCount: 1,
        winsCount: matchData.won ? 1 : 0,
        lossesCount: matchData.won ? 0 : 1
      });
      
      console.log(`Mäng lisatud mängijale ${playerId}`);
      return docRef.id;
    } catch (error) {
      console.error('Viga mängu lisamisel mängijale:', error);
      throw error;
    }
  }

  /**
   * Lisab turniiri tulemuse mängija profiilile
   * @param {string} playerId - Mängija ID
   * @param {Object} tournamentData - Turniiri andmed
   * @returns {Promise<string>} Uue turniiri kirje ID
   */
  async addTournamentToPlayer(playerId, tournamentData) {
    try {
      // Lisa turniir mängija alamkollektsiooni
      const tournamentsRef = firebaseService.getSubcollectionRef(
        'players', 
        playerId, 
        this.subcollections.TOURNAMENTS
      );
      
      // Vorminda andmed ja lisa loomisaeg
      const tournamentToSave = {
        ...tournamentData,
        date: tournamentData.date || new Date().toISOString(),
        created_at: firebaseService.timestamp()
      };
      
      // Lisa dokument Firebase'i
      const docRef = await firebaseService.addDocument(tournamentsRef, tournamentToSave);
      
      // Uuenda mängija statistikat
      await this.updatePlayerStats(playerId, {
        tournamentsCount: 1
      });
      
      console.log(`Turniir lisatud mängijale ${playerId}`);
      return docRef.id;
    } catch (error) {
      console.error('Viga turniiri lisamisel mängijale:', error);
      throw error;
    }
  }

  /**
   * Lisab reitingu muudatuse mängija ajalukku
   * @param {string} playerId - Mängija ID
   * @param {number} rating - Uus reiting
   * @returns {Promise<void>}
   */
  async addRatingHistoryEntry(playerId, rating) {
    try {
      // Loe praegune mängija info
      const playerData = await firebaseService.getPlayer(playerId);
      
      if (!playerData) {
        throw new Error('Mängijat ei leitud');
      }
      
      // Lisa uus reiting mängija reitingute ajalukku
      const ratingHistory = playerData.ratingHistory || [];
      ratingHistory.push({
        date: new Date().toISOString(),
        rating: rating
      });
      
      // Uuenda mängija andmed
      await firebaseService.updatePlayer(playerId, {
        ratingHistory: ratingHistory,
        ranking: rating, // Uuenda ka praegune reiting
        lastUpdated: firebaseService.timestamp()
      });
      
      console.log(`Reiting uuendatud mängijale ${playerId}: ${rating}`);
    } catch (error) {
      console.error('Viga reitingu ajaloo lisamisel:', error);
      throw error;
    }
  }

  /**
   * Lisab grupi muudatuse mängija ajalukku
   * @param {string} playerId - Mängija ID
   * @param {string} group - Uus grupp
   * @returns {Promise<void>}
   */
  async addGroupHistoryEntry(playerId, group) {
    try {
      // Loe praegune mängija info
      const playerData = await firebaseService.getPlayer(playerId);
      
      if (!playerData) {
        throw new Error('Mängijat ei leitud');
      }
      
      // Loe praegune grupiajalugu
      const groupHistory = playerData.groupHistory || [];
      
      // Kontrolli, kas viimane kirje on sama grupp - kui jah, siis pole vaja uut lisada
      if (groupHistory.length > 0) {
        const lastEntry = groupHistory[groupHistory.length - 1];
        if (lastEntry.group === group) {
          return; // Juba sama grupp, pole vaja uuendada
        }
      }
      
      // Lisa uus grupp ajalukku
      groupHistory.push({
        date: new Date().toISOString(),
        group: group
      });
      
      // Uuenda mängija andmed
      await firebaseService.updatePlayer(playerId, {
        groupHistory: groupHistory,
        group: group, // Uuenda ka praegune grupp
        lastUpdated: firebaseService.timestamp()
      });
      
      console.log(`Grupp uuendatud mängijale ${playerId}: ${group}`);
    } catch (error) {
      console.error('Viga grupi ajaloo lisamisel:', error);
      throw error;
    }
  }

  /**
   * Uuendab mängija statistikat
   * @param {string} playerId - Mängija ID
   * @param {Object} statsUpdate - Statistika uuendused
   * @returns {Promise<void>}
   */
  async updatePlayerStats(playerId, statsUpdate) {
    try {
      // Loe praegune mängija info
      const playerData = await firebaseService.getPlayer(playerId);
      
      if (!playerData) {
        throw new Error('Mängijat ei leitud');
      }
      
      // Alusta tühja statistikaga, kui see puudub
      const stats = playerData.stats || {
        matchesCount: 0,
        winsCount: 0,
        lossesCount: 0,
        tournamentsCount: 0,
        winRate: 0
      };
      
      // Uuenda statistikat
      if (statsUpdate.matchesCount) stats.matchesCount += statsUpdate.matchesCount;
      if (statsUpdate.winsCount) stats.winsCount += statsUpdate.winsCount;
      if (statsUpdate.lossesCount) stats.lossesCount += statsUpdate.lossesCount;
      if (statsUpdate.tournamentsCount) stats.tournamentsCount += statsUpdate.tournamentsCount;
      
      // Arvuta võiduprotsent
      if (stats.matchesCount > 0) {
        stats.winRate = (stats.winsCount / stats.matchesCount) * 100;
      }
      
      // Uuenda mängija andmed
      await firebaseService.updatePlayer(playerId, {
        stats: stats,
        lastUpdated: firebaseService.timestamp()
      });
    } catch (error) {
      console.error('Viga mängija statistika uuendamisel:', error);
      throw error;
    }
  }

  /**
   * Loeb mängija mängude ajaloo
   * @param {string} playerId - Mängija ID
   * @param {number} limit - Maks tulemuste arv
   * @returns {Promise<Array>} Mängude nimekiri
   */
  async getPlayerMatches(playerId, limit = 15) {
    try {
      // Küsi mängud Firebase'ist
      const matchesRef = firebaseService.getSubcollectionRef(
        'players', 
        playerId, 
        this.subcollections.MATCHES
      );
      
      // Sorteeri kuupäeva järgi, uuemad eespool
      const matches = await firebaseService.queryDocuments(matchesRef, {
        orderBy: [{ field: 'date', direction: 'desc' }],
        limit: limit
      });
      
      return matches;
    } catch (error) {
      console.error('Viga mängija mängude lugemisel:', error);
      return [];
    }
  }

  /**
   * Loeb mängija turniiride ajaloo
   * @param {string} playerId - Mängija ID
   * @param {number} limit - Maks tulemuste arv
   * @returns {Promise<Array>} Turniiride nimekiri
   */
  async getPlayerTournaments(playerId, limit = 10) {
    try {
      // Küsi turniirid Firebase'ist
      const tournamentsRef = firebaseService.getSubcollectionRef(
        'players', 
        playerId, 
        this.subcollections.TOURNAMENTS
      );
      
      // Sorteeri kuupäeva järgi, uuemad eespool
      const tournaments = await firebaseService.queryDocuments(tournamentsRef, {
        orderBy: [{ field: 'date', direction: 'desc' }],
        limit: limit
      });
      
      return tournaments;
    } catch (error) {
      console.error('Viga mängija turniiride lugemisel:', error);
      return [];
    }
  }

  /**
   * Loeb mängija reitingute ajaloo
   * @param {string} playerId - Mängija ID
   * @returns {Promise<Array>} Reitingute ajaloo nimekiri
   */
  async getPlayerRatingHistory(playerId) {
    try {
      // Loe mängija andmed
      const playerData = await firebaseService.getPlayer(playerId);
      if (!playerData) {
        return [];
      }
      
      return playerData.ratingHistory || [];
    } catch (error) {
      console.error('Viga mängija reitingute ajaloo lugemisel:', error);
      return [];
    }
  }

  /**
   * Loeb mängija gruppide ajaloo
   * @param {string} playerId - Mängija ID
   * @returns {Promise<Array>} Gruppide ajaloo nimekiri
   */
  async getPlayerGroupHistory(playerId) {
    try {
      // Loe mängija andmed
      const playerData = await firebaseService.getPlayer(playerId);
      if (!playerData) {
        return [];
      }
      
      return playerData.groupHistory || [];
    } catch (error) {
      console.error('Viga mängija gruppide ajaloo lugemisel:', error);
      return [];
    }
  }
  
  /**
   * Leiab mängija koha edetabelis
   * @param {string} playerId - Mängija ID
   * @returns {Promise<number|null>} Mängija koht (1-põhine) või null, kui ei leitud
   */
  async getPlayerRanking(playerId) {
    try {
      // Küsi kõik mängijad, sorteeritud reitingu järgi
      const players = await firebaseService.getAllPlayers();
      
      // Sorteeri reitingu järgi kahanevalt
      const sortedPlayers = players.sort((a, b) => (b.ranking || 0) - (a.ranking || 0));
      
      // Leia mängija indeks
      const playerIndex = sortedPlayers.findIndex(p => p.id === playerId);
      
      // Tagasta koht (indeks + 1) või null, kui ei leidnud
      return playerIndex !== -1 ? playerIndex + 1 : null;
    } catch (error) {
      console.error('Viga mängija edetabeli koha lugemisel:', error);
      return null;
    }
  }

  /**
   * Loeb mängija profiili täielikud andmed
   * @param {string} playerId - Mängija ID
   * @returns {Promise<Object>} Mängija profiil koos statistika ja ajalooga
   */
  async getPlayerProfile(playerId) {
    try {
      // Loe mängija põhiandmed
      const playerData = await firebaseService.getPlayer(playerId);
      if (!playerData) {
        throw new Error('Mängijat ei leitud');
      }
      
      // Loe mängija mängud ja turniirid
      const [matches, tournaments, ranking] = await Promise.all([
        this.getPlayerMatches(playerId, 10),
        this.getPlayerTournaments(playerId, 5),
        this.getPlayerRanking(playerId)
      ]);
      
      // Tagasta täielik profiil
      return {
        ...playerData,
        matches,
        tournaments,
        ranking
      };
    } catch (error) {
      console.error('Viga mängija profiili lugemisel:', error);
      throw error;
    }
  }
}

// Loo ja ekspordi teenuse instants
const playerProfileService = new PlayerProfileService();

// Ekspordi globaalselt, et oleks saadaval window objektil
window.playerProfileService = playerProfileService;

// Ekspordi vaikimisi ja nimeliselt, et oleks moodulina kasutatav
export default playerProfileService;
export { playerProfileService };