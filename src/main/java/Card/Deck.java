package main.java.Card;

import java.util.ArrayList;
import java.util.Random;


/**
 * Represents the deck of cards.
 */
public class Deck {

    private ArrayList<Card> pile;
    private ArrayList<Card> pot;


    /**
     * Creates a new instance of Deck.
     */
    public Deck()
    {
        pot = new ArrayList<>();
        pile = new ArrayList<>();
    }


    /**
     * Removes a card from the pot.
     *
     * @return Card
     * @throws InterruptedException
     */
    public synchronized Card removeCard() throws InterruptedException
    {
        Card Card = pot.remove(pot.size() -1);

        if (pot.size() == 0) {
            this.refillPot();
         }

        return Card;
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
     * Shuffles the deck of cards by replacing giving the cards a different position in the pile.
     */
    public void shuffle()
    {
        Random random = new Random(pile.size() -1);
        int positionOne;
        Card auxiliaryCard;

        for (int i = 0; i < pile.size(); i++) {

           positionOne = random.nextInt(pile.size() -1);
         
            auxiliaryCard = pile.get(positionOne);
            pile.set(positionOne, pile.get(i));
            pile.set(i, auxiliaryCard);
        }
        refillPot();
    }


    /**
     * Shows the cards.
     */
    public void Show()
    {
        Card aux;
        for (int i=0; i<48; i++) {
            aux = pile.get(i);
            System.out.println(aux.getNumber()+" "+aux.getSuit());
        }
    }
    
    
    private synchronized void refillPot()
    {
        pot = (ArrayList<Card>) pile.clone();
        pile.clear();
    }
}
