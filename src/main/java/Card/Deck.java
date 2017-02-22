package Card;

import Exception.GameException;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Random;


/**
 * Represents the deck of cards.
 */
public class Deck {

    private ArrayList<Card> pile;
    private ArrayList<Card> pot;
    private String[] suits;


    /**
     * Creates a new instance of Deck.
     */
    public Deck(String[] suits) throws GameException
    {
        if (suits.length < 2) {
            throw new GameException("You need a minimum of 2 suits");
        }
        this.suits = suits;
        this.pot = new ArrayList<>();
        this.pile = new ArrayList<>();
        this.generateCards();
    }


    /**
     * Removes a card from the pot.
     *
     * @return Card
     * @throws InterruptedException
     */
    public synchronized Card removeCard() throws InterruptedException
    {
        Card card = pot.remove(pot.size() -1);

        if (pot.size() == 0) {
            this.refillPot();
         }

        return card;
    }

    /**
     * Adds a card to the pot.
     *
     * @param card The card to add.
     */
    public synchronized void addCard(Card card)
    {
        pile.add(card);
    }

    /**
     * Shuffles the deck of cards by replacing giving the cards a different position in the pot.
     */
    public void shuffle()
    {
        Random random = new Random(pot.size() -1);
        int positionOne;
        Card auxiliaryCard;

        for (int i = 0; i < pot.size(); i++) {

           positionOne = random.nextInt(pot.size() -1);
         
            auxiliaryCard = pot.get(positionOne);
            pot.set(positionOne, pot.get(i));
            pot.set(i, auxiliaryCard);
        }
    }


    /**
     * Generate cards.
     */
    public ArrayList<Card> generateCards() {
        if (this.pot.size() > 0) {
            this.pot.clear();
        }
        Arrays.asList(this.suits).forEach(suit -> {
            for (int x = 1; x < 13; x++) {
                this.pot.add(new Card(x, suit));
            }
        });
        return this.pot;
    }

    public String[] getSuits() {
        return suits;
    }


    public ArrayList<Card> getPot() {
        return pot;
    }

    /**
     * Refills the pot.
     */
    private synchronized void refillPot()
    {
        pot = (ArrayList<Card>) pile.clone();
        pile.clear();
    }
}
