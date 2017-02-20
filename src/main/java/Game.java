package main.java;

import main.java.Card.Deck;
import main.java.Exception.GameException;
import main.java.Player.Player;

import java.util.ArrayList;

/**
 * The actual game.
 */
public class Game
{
    private final Deck deckOfCards;
    private final ArrayList<Player> players;

    /**
     * The game object.
     * @param deckOfCards  The deck of cards.
     * @param players      The list of players.
     */
    public Game(Deck deckOfCards, ArrayList<Player> players) {
        this.deckOfCards = deckOfCards;
        this.players = players;
    }

    /**
     * Starts the game.
     *
     * @throws GameException
     */
    public void start() throws GameException {
        if (players.size() > deckOfCards.getSuits().length) {
            throw new GameException("You must have the same amount of players or less than suits in the deck of cards");
        }
        deckOfCards.generateCards();
        deckOfCards.shuffle();
        players.forEach(Player::run);
    }
}
