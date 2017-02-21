package main.java.Player;

import main.java.Card.Card;
import main.java.Card.Deck;

/**
 * Class player, represents the person playing the game.
 */
public class Player implements Runnable
{
    private Deck deck;
    private Card lastCard;
    private String name;

    /**
     * Creates deck new instance of Player
     *
     * @param m The deck of cards.
     * @param name The players name.
     */
    public Player(Deck m, String name)
    {
        this.name = name;
        this.deck = m;
        
    }
    
    public void run ()
    {
        Card removed;
        while (lastCard == null) {
            
            try {
                Thread.sleep(50);
                removed = deck.removeCard();
                if (removed.getNumber() == 1) {
                    lastCard = removed;
                } else {
                    deck.addCard(removed);
                }

            } catch (InterruptedException ex) {
                ex.printStackTrace ();
            }
        }

        while (lastCard.getNumber() < 12) {
            try {
                Thread.sleep(50);
                removed = deck.removeCard ();
                int resta = removed.getNumber() - lastCard.getNumber();

                if ( (resta == 1) && (removed.getSuit().equals(lastCard.getSuit())) ) {
                    lastCard = removed;
                } else {
                    deck.addCard(removed);
                }

                System.out.println(this.name +" took "+removed.getNumber()+" of "+removed.getSuit());
                System.out.println(this.name +" last card was "+ lastCard.getNumber()+" of "+ lastCard.getSuit());
                
            } catch (InterruptedException ex) {
                ex.printStackTrace ();
            }
            
        }
        
        System.out.println("************** "+this.name+" has finished playing the game ************");
        
    }
    
}
