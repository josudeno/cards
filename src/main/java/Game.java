import Card.Deck;
import Player.Player;
import Exception.GameException;

import java.util.ArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

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
        deckOfCards.shuffle();
        deckOfCards.shuffle();
        deckOfCards.shuffle();
        ExecutorService executor = Executors.newScheduledThreadPool(players.size());
        players.forEach(executor::execute);
        executor.shutdown();
        while (!executor.isTerminated()) {
            try {
                executor.awaitTermination(10, TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}
