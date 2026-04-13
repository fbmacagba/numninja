import tkinter as tk
from tkinter import ttk, messagebox
import random
import time
import json
import os
from datetime import datetime

class ResponsiveNumberGuessingGame:
    def __init__(self, root):
        self.root = root
        self.root.title("🎯 NumGenius")
        self.root.configure(bg="#2C3E50")
        
        # Screen size detection and responsive settings
        self.screen_width = self.root.winfo_screenwidth()
        self.screen_height = self.root.winfo_screenheight()
        self.is_small_screen = self.screen_width < 1024 or self.screen_height < 768
        
        # Set initial window size based on screen size
        if self.is_small_screen:
            # Full screen or nearly full screen for small devices
            self.root.geometry(f"{min(800, self.screen_width)}x{min(600, self.screen_height)}")
            self.root.state('zoomed')  # Maximize on small screens
        else:
            # Widget mode for large screens
            self.root.geometry("450x600")
            self.root.resizable(True, True)
        
        # Game variables
        self.secret_number = random.randint(1, 100)
        self.attempts = 0
        self.max_attempts = 10
        self.score = 1000
        self.start_time = time.time()
        self.previous_guesses = []
        self.player_alias = ""
        self.scores_file = "numgenius_scores.json"
        
        # Screen management
        self.current_screen = None
        self.game_frame = None
        self.ranking_frame = None
        
        # Responsive scaling factors
        self.scale_factor = self.calculate_scale_factor()
        
        # Load existing scores
        self.high_scores = self.load_scores()
        
        # Setup modern theme
        self.setup_styles()
        self.show_login_screen()
        
        # Bind resize events for responsiveness
        self.root.bind('<Configure>', self.on_window_resize)
        
    def calculate_scale_factor(self):
        """Calculate scaling factor based on screen size"""
        base_width = 450  # Base design width
        base_height = 600  # Base design height
        
        if self.is_small_screen:
            # More aggressive scaling for small screens
            return min(self.screen_width / base_width, self.screen_height / base_height) * 0.9
        else:
            # Moderate scaling for larger screens
            return 1.0
            
    def on_window_resize(self, event):
        """Handle window resize events"""
        if event.widget == self.root:
            self.scale_factor = self.calculate_scale_factor()
            self.update_scaling()
            
    def update_scaling(self):
        """Update all UI elements with new scaling"""
        if self.current_screen == "game":
            self.update_game_scaling()
        elif self.current_screen == "ranking":
            self.update_ranking_scaling()
            
    def scaled_font(self, base_size):
        """Return scaled font size"""
        return int(base_size * self.scale_factor)
    
    def scaled_value(self, base_value):
        """Return scaled value"""
        return int(base_value * self.scale_factor)
    
    def setup_styles(self):
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Configure colors
        self.colors = {
            'primary': '#3498DB',
            'secondary': '#2C3E50',
            'accent': '#E74C3C',
            'success': '#2ECC71',
            'warning': '#F39C12',
            'light': '#ECF0F1',
            'dark': '#34495E',
            'gold': '#FFD700',
            'silver': '#C0C0C0',
            'bronze': '#CD7F32'
        }
        
        # Configure scalable styles
        font_sizes = {
            'title': self.scaled_font(18),
            'normal': self.scaled_font(12),
            'small': self.scaled_font(10),
            'large': self.scaled_font(14)
        }
        
        self.style.configure('TFrame', background=self.colors['secondary'])
        self.style.configure('Title.TLabel', 
                           background=self.colors['secondary'],
                           foreground=self.colors['light'],
                           font=('Arial', font_sizes['title'], 'bold'))
        self.style.configure('Score.TLabel',
                           background=self.colors['dark'],
                           foreground=self.colors['light'],
                           font=('Arial', font_sizes['normal'], 'bold'))
        self.style.configure('Guess.TButton',
                           background=self.colors['primary'],
                           foreground='white',
                           font=('Arial', font_sizes['normal'], 'bold'))
        self.style.configure('Action.TButton',
                           background=self.colors['accent'],
                           foreground='white',
                           font=('Arial', font_sizes['normal'], 'bold'))
        self.style.configure('Ranking.TButton',
                           background=self.colors['success'],
                           foreground='white',
                           font=('Arial', font_sizes['normal'], 'bold'))
        self.style.configure('Back.TButton',
                           background=self.colors['warning'],
                           foreground='white',
                           font=('Arial', font_sizes['normal'], 'bold'))
        
    def clear_screen(self):
        """Clear all widgets from the root window"""
        for widget in self.root.winfo_children():
            widget.destroy()
        self.current_screen = None
        
    def show_login_screen(self):
        self.clear_screen()
        self.current_screen = "login"
        
        padding = self.scaled_value(30)
        login_frame = ttk.Frame(self.root, padding=padding)
        login_frame.pack(fill=tk.BOTH, expand=True)
        
        ttk.Label(login_frame, 
                 text="🎯 Welcome to NumGenius!", 
                 style='Title.TLabel').pack(pady=self.scaled_value(20))
        
        ttk.Label(login_frame, 
                 text="Enter your player alias:",
                 foreground=self.colors['light'],
                 background=self.colors['secondary'],
                 font=('Arial', self.scaled_font(12))).pack(pady=self.scaled_value(10))
        
        self.alias_var = tk.StringVar()
        alias_entry = ttk.Entry(login_frame, 
                              textvariable=self.alias_var,
                              font=('Arial', self.scaled_font(14)),
                              justify='center',
                              width=self.scaled_value(20))
        alias_entry.pack(pady=self.scaled_value(10))
        alias_entry.bind('<Return>', lambda e: self.start_game())
        
        start_btn = ttk.Button(login_frame, 
                             text="🚀 Start Game", 
                             command=self.start_game,
                             style='Action.TButton')
        start_btn.pack(pady=self.scaled_value(10))
        
        # Show top 3 scores if available
        if self.high_scores:
            ttk.Label(login_frame, 
                     text="🏆 Current Champions:",
                     foreground=self.colors['gold'],
                     background=self.colors['secondary'],
                     font=('Arial', self.scaled_font(12), 'bold')).pack(pady=(self.scaled_value(30), self.scaled_value(5)))
            
            for i, score in enumerate(self.high_scores[:3]):
                emoji = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
                ttk.Label(login_frame, 
                         text=f"{emoji} {score['alias']}: {score['score']}",
                         foreground=self.colors['light'],
                         background=self.colors['secondary'],
                         font=('Arial', self.scaled_font(11))).pack()
        
        alias_entry.focus()
        
    def start_game(self):
        alias = self.alias_var.get().strip()
        if not alias:
            messagebox.showwarning("Input Required", "Please enter a player alias to start!")
            return
            
        self.player_alias = alias
        self.show_game_screen()
        
    def show_game_screen(self):
        self.clear_screen()
        self.current_screen = "game"
        
        padding = self.scaled_value(20)
        self.game_frame = ttk.Frame(self.root, padding=padding)
        self.game_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header with player info
        header_frame = ttk.Frame(self.game_frame)
        header_frame.pack(fill=tk.X, pady=(0, self.scaled_value(10)))
        
        player_label = ttk.Label(header_frame, 
                               text=f"Player: {self.player_alias}",
                               foreground=self.colors['light'],
                               background=self.colors['secondary'],
                               font=('Arial', self.scaled_font(12), 'bold'))
        player_label.pack(side=tk.LEFT)
        
        title_label = ttk.Label(header_frame, 
                              text="🎯 NUMGENIUS", 
                              style='Title.TLabel')
        title_label.pack(side=tk.RIGHT)
        
        # Score panel
        score_frame = ttk.Frame(self.game_frame, style='TFrame')
        score_frame.pack(fill=tk.X, pady=(0, self.scaled_value(20)))
        
        self.score_label = ttk.Label(score_frame, 
                                   text=f"🏆 Score: {self.score}", 
                                   style='Score.TLabel')
        self.score_label.pack(side=tk.LEFT, padx=self.scaled_value(10))
        
        self.attempts_label = ttk.Label(score_frame, 
                                      text=f"🎯 Attempts: {self.attempts}/{self.max_attempts}", 
                                      style='Score.TLabel')
        self.attempts_label.pack(side=tk.RIGHT, padx=self.scaled_value(10))
        
        # Input section
        input_frame = ttk.Frame(self.game_frame)
        input_frame.pack(pady=self.scaled_value(20))
        
        ttk.Label(input_frame, 
                 text="Guess a number between 1-100:", 
                 foreground=self.colors['light'],
                 background=self.colors['secondary'],
                 font=('Arial', self.scaled_font(12))).pack()
        
        self.guess_var = tk.StringVar()
        guess_entry = ttk.Entry(input_frame, 
                              textvariable=self.guess_var,
                              font=('Arial', self.scaled_font(14)),
                              justify='center',
                              width=self.scaled_value(10))
        guess_entry.pack(pady=self.scaled_value(10))
        guess_entry.bind('<Return>', lambda e: self.check_guess())
        
        # Buttons - use grid for better responsive layout
        button_frame = ttk.Frame(self.game_frame)
        button_frame.pack(pady=self.scaled_value(10))
        
        # Use grid for responsive button layout
        guess_btn = ttk.Button(button_frame, 
                             text="🎯 Make Guess", 
                             command=self.check_guess,
                             style='Guess.TButton')
        guess_btn.grid(row=0, column=0, padx=self.scaled_value(5), pady=self.scaled_value(5))
        
        ranking_btn = ttk.Button(button_frame, 
                               text="🏆 Ranking", 
                               command=self.show_ranking_screen,
                               style='Ranking.TButton')
        ranking_btn.grid(row=0, column=1, padx=self.scaled_value(5), pady=self.scaled_value(5))
        
        new_game_btn = ttk.Button(button_frame, 
                                text="🔄 New Game", 
                                command=self.new_game,
                                style='Action.TButton')
        new_game_btn.grid(row=0, column=2, padx=self.scaled_value(5), pady=self.scaled_value(5))
        
        # Make buttons expand on small screens
        if self.is_small_screen:
            for col in range(3):
                button_frame.columnconfigure(col, weight=1)
            guess_btn.config(width=self.scaled_value(15))
            ranking_btn.config(width=self.scaled_value(15))
            new_game_btn.config(width=self.scaled_value(15))
        
        # Feedback area
        feedback_frame = ttk.Frame(self.game_frame)
        feedback_frame.pack(fill=tk.BOTH, expand=True, pady=self.scaled_value(20))
        
        self.feedback_text = tk.Text(feedback_frame,
                                   height=self.scaled_value(8),
                                   width=self.scaled_value(40),
                                   font=('Arial', self.scaled_font(10)),
                                   bg=self.colors['dark'],
                                   fg=self.colors['light'],
                                   relief=tk.FLAT,
                                   wrap=tk.WORD)
        self.feedback_text.pack(fill=tk.BOTH, expand=True)
        self.feedback_text.config(state=tk.DISABLED)
        
        # Previous guesses
        guesses_frame = ttk.Frame(self.game_frame)
        guesses_frame.pack(fill=tk.X, pady=(0, self.scaled_value(10)))
        
        ttk.Label(guesses_frame, 
                 text="Previous Guesses:", 
                 foreground=self.colors['light'],
                 background=self.colors['secondary'],
                 font=('Arial', self.scaled_font(11))).pack()
        
        self.guesses_listbox = tk.Listbox(guesses_frame,
                                        height=self.scaled_value(4),
                                        bg=self.colors['dark'],
                                        fg=self.colors['light'],
                                        relief=tk.FLAT,
                                        font=('Arial', self.scaled_font(9)))
        self.guesses_listbox.pack(fill=tk.X)
        
        # Set initial feedback
        self.show_feedback(f"Welcome, {self.player_alias}!\nGuess a number between 1-100.", "info")
        
        # Set focus to entry
        guess_entry.focus()
        
    def update_game_scaling(self):
        """Update game screen elements with current scaling"""
        if not self.game_frame:
            return
            
        # Update font sizes and layouts dynamically
        for widget in self.game_frame.winfo_children():
            if isinstance(widget, ttk.Label):
                if 'Score' in str(widget.cget('text')):
                    widget.configure(font=('Arial', self.scaled_font(12), 'bold'))
        
    def show_ranking_screen(self):
        self.clear_screen()
        self.current_screen = "ranking"
        
        padding = self.scaled_value(20)
        self.ranking_frame = ttk.Frame(self.root, padding=padding)
        self.ranking_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header
        header_frame = ttk.Frame(self.ranking_frame)
        header_frame.pack(fill=tk.X, pady=(0, self.scaled_value(20)))
        
        title_label = ttk.Label(header_frame, 
                              text="🏆 NUMGENIUS LEADERBOARD", 
                              style='Title.TLabel')
        title_label.pack()
        
        # Current player info
        player_info = ttk.Label(header_frame,
                              text=f"Player: {self.player_alias} | Current Score: {self.score}",
                              foreground=self.colors['light'],
                              background=self.colors['secondary'],
                              font=('Arial', self.scaled_font(10)))
        player_info.pack(pady=self.scaled_value(5))
        
        # Ranking list container with scrollbar for small screens
        list_container = ttk.Frame(self.ranking_frame)
        list_container.pack(fill=tk.BOTH, expand=True, pady=self.scaled_value(10))
        
        # Add scrollbar for small screens
        if self.is_small_screen:
            canvas = tk.Canvas(list_container, bg=self.colors['secondary'])
            scrollbar = ttk.Scrollbar(list_container, orient="vertical", command=canvas.yview)
            scrollable_frame = ttk.Frame(canvas)
            
            scrollable_frame.bind(
                "<Configure>",
                lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
            )
            
            canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
            canvas.configure(yscrollcommand=scrollbar.set)
            
            canvas.pack(side="left", fill="both", expand=True)
            scrollbar.pack(side="right", fill="y")
            
            list_frame = scrollable_frame
        else:
            list_frame = ttk.Frame(list_container)
            list_frame.pack(fill=tk.BOTH, expand=True)
        
        # Header row
        header_row = ttk.Frame(list_frame)
        header_row.pack(fill=tk.X, pady=(0, self.scaled_value(10)))
        
        columns = [
            ("Rank", 5, self.scaled_font(12)),
            ("Player", 20, self.scaled_font(12)),
            ("Score", 10, self.scaled_font(12)),
            ("Attempts", 8, self.scaled_font(12))
        ]
        
        for i, (text, width, font_size) in enumerate(columns):
            ttk.Label(header_row, text=text, width=width, 
                     foreground=self.colors['light'],
                     background=self.colors['dark'],
                     font=('Arial', font_size, 'bold')).pack(side=tk.LEFT, padx=self.scaled_value(2))
        
        # Display players
        top_players = self.high_scores[:15]  # Show more on larger screens
        if not top_players:
            no_scores_label = ttk.Label(list_frame, 
                                      text="No scores yet! Be the first champion! 🏆",
                                      foreground=self.colors['light'],
                                      background=self.colors['secondary'],
                                      font=('Arial', self.scaled_font(14), 'bold'))
            no_scores_label.pack(pady=self.scaled_value(50))
        else:
            for i, player in enumerate(top_players):
                row_frame = ttk.Frame(list_frame)
                row_frame.pack(fill=tk.X, pady=self.scaled_value(2))
                
                # Determine rank color and emoji
                if i == 0:
                    emoji, color = "🥇", self.colors['gold']
                elif i == 1:
                    emoji, color = "🥈", self.colors['silver']
                elif i == 2:
                    emoji, color = "🥉", self.colors['bronze']
                else:
                    emoji, color = f"{i+1}.", self.colors['light']
                
                # Highlight current player
                bg_color = self.colors['primary'] if player['alias'] == self.player_alias else self.colors['dark']
                
                # Rank column
                ttk.Label(row_frame, text=emoji, width=5,
                         foreground=color,
                         background=bg_color,
                         font=('Arial', self.scaled_font(12), 'bold')).pack(side=tk.LEFT, padx=self.scaled_value(2))
                
                # Player column
                ttk.Label(row_frame, text=player['alias'][:15], width=20,
                         foreground=self.colors['light'],
                         background=bg_color,
                         font=('Arial', self.scaled_font(11))).pack(side=tk.LEFT, padx=self.scaled_value(2))
                
                # Score column
                ttk.Label(row_frame, text=str(player['score']), width=10,
                         foreground=self.colors['light'],
                         background=bg_color,
                         font=('Arial', self.scaled_font(11), 'bold')).pack(side=tk.LEFT, padx=self.scaled_value(2))
                
                # Attempts column
                ttk.Label(row_frame, text=str(player.get('attempts', 'N/A')), width=8,
                         foreground=self.colors['light'],
                         background=bg_color,
                         font=('Arial', self.scaled_font(11))).pack(side=tk.LEFT, padx=self.scaled_value(2))
        
        # Footer with back button
        footer_frame = ttk.Frame(self.ranking_frame)
        footer_frame.pack(fill=tk.X, pady=self.scaled_value(20))
        
        back_btn = ttk.Button(footer_frame, 
                            text="← Back to Game", 
                            command=self.show_game_screen,
                            style='Back.TButton')
        back_btn.pack()
        
    def update_ranking_scaling(self):
        """Update ranking screen elements with current scaling"""
        pass  # Ranking screen is rebuilt on show, so no need for dynamic updates
        
    def load_scores(self):
        """Load scores from JSON file"""
        if os.path.exists(self.scores_file):
            try:
                with open(self.scores_file, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
        
    def save_score(self):
        """Save current score to file"""
        score_data = {
            'alias': self.player_alias,
            'score': self.score,
            'attempts': self.attempts,
            'timestamp': datetime.now().isoformat(),
            'number': self.secret_number
        }
        
        self.high_scores.append(score_data)
        # Sort by score descending
        self.high_scores.sort(key=lambda x: x['score'], reverse=True)
        # Keep top 50 scores
        self.high_scores = self.high_scores[:50]
        
        try:
            with open(self.scores_file, 'w') as f:
                json.dump(self.high_scores, f, indent=2)
        except:
            pass  # Silently fail if file writing fails
            
    def check_guess(self):
        """Check player's guess against secret number"""
        try:
            guess = int(self.guess_var.get())
            
            if guess < 1 or guess > 100:
                messagebox.showwarning("Invalid Input", "Please enter a number between 1 and 100.")
                return
            
            self.attempts += 1
            self.previous_guesses.append(guess)
            
            # Update score (score decreases with attempts and time)
            time_penalty = int((time.time() - self.start_time) / 10)
            self.score = max(100, 1000 - (self.attempts * 50) - time_penalty)
            
            # Update UI
            self.update_display()
            
            # Check guess
            if guess == self.secret_number:
                self.win_game()
            elif self.attempts >= self.max_attempts:
                self.lose_game()
            elif guess < self.secret_number:
                self.show_feedback("⬆️ Too low! Try a higher number.", "warning")
            else:
                self.show_feedback("⬇️ Too high! Try a lower number.", "warning")
                
            # Clear input
            self.guess_var.set("")
            
        except ValueError:
            messagebox.showerror("Invalid Input", "Please enter a valid number.")
            
    def show_feedback(self, message, message_type="info"):
        """Show feedback message in the text area"""
        if self.current_screen != "game":
            return
            
        self.feedback_text.config(state=tk.NORMAL)
        self.feedback_text.delete(1.0, tk.END)
        
        # Color coding based on message type
        if message_type == "success":
            color = self.colors['success']
        elif message_type == "warning":
            color = self.colors['warning']
        else:
            color = self.colors['light']
            
        self.feedback_text.insert(1.0, message)
        self.feedback_text.tag_add("color", 1.0, tk.END)
        self.feedback_text.tag_config("color", foreground=color)
        self.feedback_text.config(state=tk.DISABLED)
        
    def update_display(self):
        """Update game display elements"""
        if self.current_screen != "game":
            return
            
        self.attempts_label.config(text=f"🎯 Attempts: {self.attempts}/{self.max_attempts}")
        self.score_label.config(text=f"🏆 Score: {self.score}")
        
        # Update guesses list
        self.guesses_listbox.delete(0, tk.END)
        for guess in sorted(self.previous_guesses):
            self.guesses_listbox.insert(tk.END, f"Guess: {guess}")
            
        # Provide hints after certain attempts
        if self.attempts == 5:
            hint = "💡 Hint: The number is " + ("even!" if self.secret_number % 2 == 0 else "odd!")
            self.show_feedback(hint, "info")
            
    def win_game(self):
        """Handle game win scenario"""
        time_taken = int(time.time() - self.start_time)
        message = f"🎉 CONGRATULATIONS!\n\nYou guessed the number {self.secret_number}!\nAttempts: {self.attempts}\nTime: {time_taken}s\nFinal Score: {self.score}"
        self.show_feedback(message, "success")
        
        # Save score and show ranking position
        self.save_score()
        player_rank = next((i+1 for i, s in enumerate(self.high_scores) if s['alias'] == self.player_alias and s['score'] == self.score), None)
        
        if player_rank == 1:
            rank_message = "🏆 NEW HIGH SCORE! You're #1! 🏆"
        elif player_rank <= 3:
            rank_message = f"🎯 Amazing! You're #{player_rank} on the leaderboard!"
        elif player_rank <= 10:
            rank_message = f"⭐ Great job! You're #{player_rank} on the leaderboard!"
        else:
            rank_message = "👍 Good game! Check the ranking to see your position."
            
        messagebox.showinfo("You Win!", f"{message}\n\n{rank_message}")
        
    def lose_game(self):
        """Handle game loss scenario"""
        message = f"😢 GAME OVER!\n\nThe number was {self.secret_number}\nBetter luck next time!"
        self.show_feedback(message, "warning")
        messagebox.showinfo("Game Over", message)
        
    def new_game(self):
        """Start a new game"""
        self.secret_number = random.randint(1, 100)
        self.attempts = 0
        self.score = 1000
        self.start_time = time.time()
        self.previous_guesses = []
        
        self.guess_var.set("")
        self.update_display()
        self.show_feedback(f"New game started, {self.player_alias}!\nGuess a number between 1-100.", "info")

if __name__ == "__main__":
    root = tk.Tk()
    app = ResponsiveNumberGuessingGame(root)
    root.mainloop()
