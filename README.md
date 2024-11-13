# First Iteration on a project 

This first iteration was trying to use the token 2022 transfer hooks but appeared to be too limited for the functionnality I wanted to have.
(Idendity checks). 

After having more vision, I can say that using account abstraction owning the tokens, we can actually have a good permissionned token system.
This may actually be one of the best solution here BUT this is not great for liquidity, having a permissionned subsystem may be better. 
(See: https://nicolasbeaudouin.com/crypto-project)

This system was still in the monolithic fashion idea. Because I overthink performance for some practicity (account abstraction + permissionned system) 
which revealved itsef being a much better solution.


# TODO

- [x] Make sure Immutable Owner (we don't want the owner of a token account to be mutable): Checked
- [ ] Check for reinitialize attack : https://www.rareskills.io/post/init-if-needed-anchor#:~:text=The%20%E2%80%9Creinitialization%20attack%E2%80%9D%20here%20is,prevent%20multiple%20calls%20to%20initialize.
