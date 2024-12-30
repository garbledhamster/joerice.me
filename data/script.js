// Mobile Menu Toggle
document.getElementById('menu-button').addEventListener('click', function() {
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenu.classList.toggle('hidden');
});

// Handle Form Submission
document.getElementById('contact-form').addEventListener('submit', async function(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: formData
    });
    if (response.ok) {
      document.getElementById('form-success').classList.remove('hidden');
      form.reset();
      setTimeout(() => {
        document.getElementById('form-success').classList.add('hidden');
      }, 5000);
    } else {
      alert('There was an error sending your message. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('There was an error sending your message. Please try again.');
  }
});

// DOMContentLoaded Event Listener
document.addEventListener('DOMContentLoaded', function() {
  // Fade-in Animation on Scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1
  });
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    observer.observe(card);
  });
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      }, function(err) {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
