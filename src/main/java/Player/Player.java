package main.java.Player;

import main.java.Card.Card;
import main.java.Card.Deck;

/**
 * Class player, represents the person playing the game.
 */
public class Player extends Thread
{
    Deck deck;
    
    Card ult = null;
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
        while (ult == null) {
            
            try {
                Thread.sleep (7);
                sacada = deck.removeCard ();
                if (sacada.getNumber () ==1)
                    ult=sacada;
                else
                    deck.addCard(sacada);

            } catch (InterruptedException ex) {
                ex.printStackTrace ();
            }
        }

        while (ult.getNumber() < 12) {
            try {
                Thread.sleep (2);
                sacada = deck.removeCard ();
                int resta = sacada.getNumber() - ult.getNumber();

                if ( (resta==1) && (sacada.getSuit() ==ult.getSuit())) {
                    ult = sacada;
                } else {
                    deck.addCard(sacada);
                }

                System.out.println("SACADA "+this.name +" "+sacada.getNumber()+" "+sacada.getSuit());
                System.out.println("ULTIMA "+this.name +" "+ult.getNumber()+" "+ult.getSuit());
                
            } catch (InterruptedException ex) {
                ex.printStackTrace ();
            }
            
        }
        
        System.out.println (name);
        
    }
    
}
