package main.java.Player;

import main.java.Card.Card;
import main.java.Card.Deck;

/**
 * Class player, represents the person playing the game.
 */
public class Player extends Thread
{
    Deck deck;
    
    Card lastCard = null;
    String name;

    /**
     * Creates deck new instance of Player
     *
     * @param m The deck of cards.
     * @param name The players name.
     */
    public Player(Deck m, String name)
    {
        this.name = name;
        this.deck =m;
        
    }
    
    public void run ()
    {
        Card sacada;
        while (lastCard == null) {
            
            try {
                Thread.sleep(7);
                sacada = deck.removeCard();
                if (sacada.getNumber() == 1) {
                    lastCard = sacada;
                } else {
                    deck.addCard(sacada);
                }

            } catch (InterruptedException ex) {
                ex.printStackTrace ();
            }
        }

        while (lastCard.getNumber() < 12) {
            try {
                Thread.sleep (2);
                sacada = deck.removeCard ();
                int resta = sacada.getNumber() - lastCard.getNumber();

                if ( (resta==1) && (sacada.getSuit() == lastCard.getSuit())) {
                    lastCard = sacada;
                } else {
                    deck.addCard(sacada);
                }

                System.out.println(this.name +" took "+sacada.getNumber()+" of "+sacada.getSuit());
                System.out.println(this.name +" last card was "+ lastCard.getNumber()+" of "+ lastCard.getSuit());
                
            } catch (InterruptedException ex) {
                ex.printStackTrace ();
            }
            
        }
        
        System.out.println (name);
        
    }
    
}
