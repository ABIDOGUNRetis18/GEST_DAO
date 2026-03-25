-- ===========================================
-- INITIALISATION BASE DE DONNÉES DOCKER
-- ===========================================
-- Le nom de la base est défini par MYSQL_DATABASE dans le .env
-- MySQL sélectionne automatiquement la bonne base au démarrage
-- Ne jamais mettre CREATE DATABASE ou USE ici
-- ===========================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ===========================================
-- SUPPRESSION (ordre inverse des dépendances)
-- ===========================================

DROP TABLE IF EXISTS `hidden_messages`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `comments`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `tasks`;
DROP TABLE IF EXISTS `task`;
DROP TABLE IF EXISTS `dao_members`;
DROP TABLE IF EXISTS `dao_sequences`;
DROP TABLE IF EXISTS `dao`;
DROP TABLE IF EXISTS `daos`;
DROP TABLE IF EXISTS `purchases`;
DROP TABLE IF EXISTS `team_members`;
DROP TABLE IF EXISTS `teams`;
DROP TABLE IF EXISTS `sessions`;
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

-- ===========================================
-- CRÉATION DES TABLES
-- ===========================================

CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `url_photo` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role_id` int NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `accounts` (
  `id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `type` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `provider` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `provider_account_id` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `refresh_token` text COLLATE utf8mb4_general_ci,
  `access_token` text COLLATE utf8mb4_general_ci,
  `expires_at` bigint DEFAULT NULL,
  `token_type` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `scope` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `id_token` text COLLATE utf8mb4_general_ci,
  `session_state` text COLLATE utf8mb4_general_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `provider` (`provider`,`provider_account_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `session_token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `session_token` (`session_token`),
  KEY `idx_session_token` (`session_token`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `teams` (
  `id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `team_code` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `team_code` (`team_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `team_members` (
  `team_id` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`team_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `dao` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `progress` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `daos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `date_depot` date DEFAULT NULL,
  `objet` text COLLATE utf8mb4_general_ci,
  `description` text COLLATE utf8mb4_general_ci,
  `reference` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `autorite` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `chef_id` bigint unsigned DEFAULT NULL,
  `team_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `statut` enum('EN_ATTENTE','EN_COURS','A_RISQUE','TERMINEE','ARCHIVE') COLLATE utf8mb4_general_ci DEFAULT 'EN_ATTENTE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `groupement` varchar(10000) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `nom_partenaire` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero` (`numero`)
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `dao_sequences` (
  `year` int NOT NULL,
  `seq` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `dao_types` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `libelle` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_dao_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `dao_members` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dao_id` int DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `is_chef_projet` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `dao_id` (`dao_id`,`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `purchases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `status_report` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `office` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `date` date NOT NULL,
  `gross_amount` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `task` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(200) COLLATE utf8mb4_general_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dao_id` int DEFAULT NULL,
  `id_task` int NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `assigned_to` int DEFAULT NULL,
  `progress` int DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `titre` varchar(255) COLLATE utf8mb4_general_ci NOT NULL DEFAULT '',
  `statut` enum('a_faire','en_cours','termine') COLLATE utf8mb4_general_ci DEFAULT 'a_faire',
  `date_creation` date DEFAULT NULL,
  `date_echeance` date DEFAULT NULL,
  `priorite` enum('basse','moyenne','haute') COLLATE utf8mb4_general_ci DEFAULT 'moyenne',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `comments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `user_id` bigint unsigned NOT NULL,
  `text` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mentioned_user_id` bigint unsigned DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_comments_task` (`task_id`),
  KEY `idx_comments_user` (`user_id`),
  KEY `idx_comments_mentioned` (`mentioned_user_id`),
  CONSTRAINT `fk_comments_mentioned` FOREIGN KEY (`mentioned_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comments_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `task_id` int NOT NULL,
  `user_id` int NOT NULL,
  `content` text COLLATE utf8mb4_general_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `mentioned_user_id` int DEFAULT NULL,
  `mentioned_user_name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_public` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_task_id` (`task_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=60 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `hidden_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `message_id` int NOT NULL,
  `hidden_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_message` (`user_id`,`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `title` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci NOT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user` (`user_id`),
  KEY `idx_notifications_created_at` (`created_at`),
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ===========================================
-- DONNÉES INITIALES
-- ===========================================

INSERT INTO `roles` (id, name) VALUES
(1, 'DirecteurGeneral'),
(2, 'Administrateur'),
(3, 'ChefProjet'),
(4, 'MembreEquipe'),
(5, 'Lecteur');

-- ===========================================
-- UTILISATEUR ADMIN
-- Générer le hash avant déploiement :
-- node -e "require('bcrypt').hash('VOTRE_MOT_DE_PASSE',12).then(console.log)"
-- Remplacer BCRYPT_HASH_A_REMPLACER par le hash généré
-- ===========================================
INSERT INTO `users` (id, username, email, password, role_id) VALUES
(1, 'admin', 'admin@dao.com', '$2b$12$HpL12Vnv178cTnrc8oQms.gPmQcJbl9tdm6NXvwdiAqWjYs/90Dj2', 2);

INSERT INTO `task` (id, nom) VALUES
(1,  'Résumé sommaire DAO et Création du drive'),
(2,  'Demande de caution et garanties'),
(3,  'Identification et renseignement des profils dans le drive'),
(4,  'Identification et renseignement des ABE dans le drive'),
(5,  'Légalisation des ABE, diplômes, certificats, attestations et pièces administratives requis'),
(6,  'Indication directive d\'élaboration de l\'offre financier'),
(7,  'Elaboration de la méthodologie'),
(8,  'Planification prévisionnelle'),
(9,  'Identification des références précises des équipements et matériels'),
(10, 'Demande de cotation'),
(11, 'Elaboration du squelette des offres'),
(12, 'Rédaction du contenu des OF et OT'),
(13, 'Contrôle et validation des offres'),
(14, 'Impression et présentation des offres (Valider l\'étiquette)'),
(15, 'Dépôt des offres et clôture');

INSERT INTO `dao_sequences` (year, seq) VALUES (YEAR(CURRENT_DATE), 0);

INSERT INTO `purchases` (id, name, status_report, office, price, date, gross_amount) VALUES
(1, 'Jeremy Ortega', 'Levelled up',         'Catalinaborough', 790.00,   '2018-01-06', 2274253.00),
(2, 'Alvin Fisher',  'Ui design completed', 'East Mayra',      23230.00, '2018-07-18',   83127.00),
(3, 'John Doe',      'Project completed',   'New York',        1234.00,  '2018-12-01',  567890.00);

-- ===========================================
-- RESTAURATION
-- ===========================================

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

SELECT 'Base initialisée avec succès ✓' AS message;