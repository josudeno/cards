package Card;

import Exception.GameException;
import org.junit.Test;
import java.util.ArrayList;
import static junit.framework.Assert.assertSame;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotEquals;

/**
 * Player test
 */
public class DeckTest
{

    private Deck deck;

    @Test
    public void testCreateDeck() {
        String[] suits = new String[]{"spades", "coins"};
        Deck deckOfCards = null;
        try {
            deckOfCards = new Deck(suits);
        } catch (GameException e) {
            e.printStackTrace();
        }
        assertSame(deckOfCards.getSuits(), suits);

    }


    @Test
    public void testGenerateCards() throws GameException {
        ArrayList<Card> cards = this.getDummyDeck().generateCards();
        assertEquals(cards.size(), 24);
        ArrayList<Card> cards2 = this.getDummyDeck().generateCards();
        assertEquals(cards2.size(), 24);
    }

    @Test
    public void testShuffle() throws GameException {
        Card firstCard = this.getDummyDeck().getPot().get(0);
        Card fifthCard = this.getDummyDeck().getPot().get(4);
        Card tenthCard = this.getDummyDeck().getPot().get(9);

        this.getDummyDeck().shuffle();

        assertNotEquals(firstCard, this.getDummyDeck().getPot().get(0));
        assertNotEquals(fifthCard, this.getDummyDeck().getPot().get(4));
        assertNotEquals(tenthCard, this.getDummyDeck().getPot().get(9));

    }

    private Deck getDummyDeck() throws GameException {
        if (deck == null) {
            deck = new Deck(new String[]{"spades", "coins"});
        }
        return deck;
    }
}
