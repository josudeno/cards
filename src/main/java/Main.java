import Card.Deck;
import Exception.GameException;
import Player.Factory;

/**
 * Main class.
 */
public class Main
{

    public static void main (String [] args) throws GameException {

        Deck deckOfCards = new Deck(new String[]{"Coin", "Club", "Sword", "Cup"});

        Factory playerFactory = new Factory(deckOfCards);

        Game game = new Game(deckOfCards, playerFactory.createPlayers(new String[]{"Audley Chibuike", "Raquel Adelle", "Ginny Ned"}));

        game.start();
    }
}
