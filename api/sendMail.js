import express from 'express';
// Email Service Class
class EmailService {
  constructor() {
    // Configure the mock email providers
    this.providers = [
      'user1@example.com',
      'user2@example.com',
    ];

    // Initialize variables
    this.attempts = 0;
    this.maxRetries = 2;
    this.retryDelay = 1000; // Starting delay in ms (1 second)
    this.lastSendTime = 0;
    this.rateLimitInterval = 60000; // 1 minute rate limit
    this.sentEmails = new Set(); // To track sent emails for idempotency
  }

  // Mock email provider function
  emailProvider(providerName) {
    return {
      name: providerName,
      sendMail: async (mailOptions) => {
        this.attempts++;

        // Simulate random failures
        const isSuccess = Math.random() > 0.5; // 50% chance of success
        const currentTime = new Date().toISOString();

        if (isSuccess) {
          console.log(`${providerName} successfully sent email on attempt ${this.attempts} at ${currentTime}: `, mailOptions);
          return { success: true };
        } else {
          if (this.attempts <= this.maxRetries) {
            console.log(`${providerName} failed on attempt ${this.attempts}. Retrying...`);
            return { success: false };
          } else {
            console.log(`${providerName} failed after ${this.maxRetries} attempts. Giving up.`);
            return { success: false };
          }
        }
      }
    };
  }

  // Send email logic with retry and fallback
  async sendEmail() {
    const chosenOption = Math.random() < 0.5 ? this.providers[0] : this.providers[1];
    const mailOptions = {
      from: chosenOption,
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
    };

    let success = false;
    let attempts = 0;

    // Loop through providers with retry logic
    while (attempts < this.maxRetries && !success) {
      try {
        const provider = this.emailProvider(chosenOption);
        console.log(`Attempting to send email with ${provider.name}, attempt ${attempts + 1}`);
        await provider.sendMail(mailOptions);

        success = true;
        console.log('Email sent successfully!');
      } catch (error) {
        attempts++;
        const delay = this.retryDelay * Math.pow(2, attempts);
        console.log(`Attempt ${attempts} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));  // Implementing the retry delay
      }
    }

    // If max retries are exhausted, try with the fallback provider
    if (!success && attempts >= this.maxRetries) {
      const fallbackProvider = this.emailProvider(this.providers[1]);
      console.log('Switching to fallback provider...');
      await fallbackProvider.sendMail(mailOptions);
      success = true; // Assume fallback works for this example
    }

    return { success };
  }
}

// Initialize Express app
const app = express();

// Middleware to parse JSON request body
app.use(express.json());

// API endpoint to send email
app.post('/send-email', async (req, res) => {
  const emailService = new EmailService();
  try {
    const result = await emailService.sendEmail();
    if (result.success) {
      res.status(200).send('Email sent successfully!');
    } else {
      res.status(500).send('Failed to send email after retries.');
    }
  } catch (error) {
    res.status(500).send('Error sending email: ' + error.message);
  }
});

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Email service API is running on http://localhost:${port}`);
});
