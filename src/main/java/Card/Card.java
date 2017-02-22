package Card;

/**
 * Class Card
 */
public class Card
{
    
    private int number;
    private String suit;

    /**
     * Creates a new instance of card.
     *
     * @param number  The card number.
     * @param suit    The card suit.
     */
    public Card(int number, String suit)
    {
        this.number = number;
        this.suit = suit;
    }


    /**
     * Returns the number
     */
    public int getNumber()
    {
        return number;
    }


    /**
     * Get suit.
     */
    public String getSuit()
    {
        return suit;
    }
}
