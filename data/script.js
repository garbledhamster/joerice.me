// Toggle Mobile Menu
const mobileButton = document.getElementById('mobile-button');
const mobileMenu   = document.getElementById('mobile-menu');
mobileButton.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

// Handle Form Submission
const contactForm  = document.getElementById('contact-form');
const formSuccess  = document.getElementById('form-success');
contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  try {
    const response = await fetch(contactForm.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: formData
    });
    if (response.ok) {
      formSuccess.style.display = 'block';
      contactForm.reset();
      setTimeout(() => {
        formSuccess.style.display = 'none';
      }, 5000);
    } else {
      alert('There was an error sending your message. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('There was an error sending your message. Please try again.');
  }
});

// Intersection Observer for fade-in effect
document.addEventListener('DOMContentLoaded', function() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1 });

  const sections = document.querySelectorAll('.fade-in');
  sections.forEach((section) => {
    observer.observe(section);
  });
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}
