document.addEventListener("DOMContentLoaded", () => {
    // Mobile Menu Toggle
    const menuToggle = document.querySelector(".menu-toggle")
    const navList = document.querySelector(".nav-list")
  
    if (menuToggle && navList) {
      menuToggle.addEventListener("click", function () {
        this.classList.toggle("active")
        navList.classList.toggle("active")
      })
  
      // Close menu when clicking on a nav link
      const navLinks = document.querySelectorAll(".nav-list a")
      navLinks.forEach((link) => {
        link.addEventListener("click", () => {
          menuToggle.classList.remove("active")
          navList.classList.remove("active")
        })
      })
  
      // Close menu when clicking outside
      document.addEventListener("click", (event) => {
        const isClickInsideNav = navList.contains(event.target)
        const isClickOnToggle = menuToggle.contains(event.target)
  
        if (navList.classList.contains("active") && !isClickInsideNav && !isClickOnToggle) {
          menuToggle.classList.remove("active")
          navList.classList.remove("active")
        }
      })
    }
  
    // Header scroll effect
    const header = document.querySelector(".header")
    window.addEventListener("scroll", () => {
      if (window.scrollY > 50) {
        header.classList.add("scrolled")
      } else {
        header.classList.remove("scrolled")
      }
    })
  
    // Initialize all sliders
    initializeAllSliders()
  
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault()
  
        const targetId = this.getAttribute("href")
        const targetElement = document.querySelector(targetId)
  
        if (targetElement) {
          const headerHeight = document.querySelector(".header").offsetHeight
          const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight
  
          window.scrollTo({
            top: targetPosition,
            behavior: "smooth",
          })
        }
      })
    })
  
    // Active menu item based on scroll position
    const sections = document.querySelectorAll("section")
    const navLinks = document.querySelectorAll(".nav-list a")
  
    window.addEventListener("scroll", () => {
      let current = ""
      const headerHeight = document.querySelector(".header").offsetHeight
  
      sections.forEach((section) => {
        const sectionTop = section.offsetTop - headerHeight - 100
        const sectionHeight = section.offsetHeight
  
        if (window.pageYOffset >= sectionTop) {
          current = section.getAttribute("id")
        }
      })
  
      navLinks.forEach((link) => {
        link.classList.remove("active")
        if (link.getAttribute("href") === `#${current}`) {
          link.classList.add("active")
        }
      })
    })
  
    // Add animation classes on scroll
    const animateElements = document.querySelectorAll(
      ".mission-content, .vision-content, .extension-card, .birthday-card, .event-card",
    )
  
    function checkIfInView() {
      animateElements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top
        const windowHeight = window.innerHeight
  
        if (elementTop < windowHeight - 100) {
          element.classList.add("fade-in")
        }
      })
    }
  
    // Initial check
    checkIfInView()
  
    // Check on scroll
    window.addEventListener("scroll", checkIfInView)
  
    // Add staggered animation delays to extension cards
    const extensionCards = document.querySelectorAll(".extension-card")
    extensionCards.forEach((card, index) => {
      const delay = (index % 3) * 100
      card.classList.add(`delay-${delay}`)
    })
  
    // Function to initialize all sliders on the page
    function initializeAllSliders() {
      // Get all birthday slider containers on the page
      const birthdaySliders = document.querySelectorAll(".birthday-slider")
  
      birthdaySliders.forEach((sliderContainer) => {
        const container = sliderContainer.querySelector(".slider-container")
        const prevBtn = sliderContainer.querySelector(".prev-btn")
        const nextBtn = sliderContainer.querySelector(".next-btn")
        const cards = container.querySelectorAll(".birthday-card")
  
        if (container && prevBtn && nextBtn && cards.length > 0) {
          let currentIndex = 0
          const cardCount = cards.length
  
          // Set initial position
          updateSlider()
  
          // Event listeners for slider controls
          prevBtn.addEventListener("click", () => {
            currentIndex = (currentIndex - 1 + cardCount) % cardCount
            updateSlider()
          })
  
          nextBtn.addEventListener("click", () => {
            currentIndex = (currentIndex + 1) % cardCount
            updateSlider()
          })
  
          // Function to update slider position
          function updateSlider() {
            const translateValue = -currentIndex * 100 + "%"
            container.style.transform = `translateX(${translateValue})`
  
            // Add active class to current card
            cards.forEach((card, index) => {
              if (index === currentIndex) {
                card.classList.add("active")
  
                // Create confetti effect for active card
                createConfetti(card)
              } else {
                card.classList.remove("active")
  
                // Remove confetti from inactive cards
                const confetti = card.querySelector(".confetti")
                if (confetti) {
                  confetti.innerHTML = ""
                }
              }
            })
          }
  
          // Create confetti effect
          function createConfetti(card) {
            const iconContainer = card.querySelector(".birthday-icon-container")
            if (!iconContainer) return
  
            let confetti = iconContainer.querySelector(".confetti")
  
            if (!confetti) {
              confetti = document.createElement("div")
              confetti.className = "confetti"
              iconContainer.appendChild(confetti)
            }
  
            confetti.innerHTML = ""
  
            // Add confetti particles
            for (let i = 0; i < 5; i++) {
              const span = document.createElement("span")
              span.style.left = `${Math.random() * 100}%`
              span.style.animationDuration = `${2 + Math.random() * 2}s`
              span.style.animationDelay = `${Math.random() * 0.5}s`
              confetti.appendChild(span)
            }
          }
  
          // Add touch swipe functionality for mobile
          let touchStartX = 0
          let touchEndX = 0
  
          container.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX
          })
  
          container.addEventListener("touchend", (e) => {
            touchEndX = e.changedTouches[0].screenX
            handleSwipe()
          })
  
          function handleSwipe() {
            const swipeThreshold = 50
            if (touchEndX < touchStartX - swipeThreshold) {
              // Swipe left - next slide
              nextBtn.click()
            } else if (touchEndX > touchStartX + swipeThreshold) {
              // Swipe right - previous slide
              prevBtn.click()
            }
          }
  
          // Auto-advance slides every 5 seconds
          let slideInterval = setInterval(() => {
            nextBtn.click()
          }, 5000)
  
          // Pause auto-advance on hover
          sliderContainer.addEventListener("mouseenter", () => {
            clearInterval(slideInterval)
          })
  
          sliderContainer.addEventListener("mouseleave", () => {
            slideInterval = setInterval(() => {
              nextBtn.click()
            }, 5000)
          })
        }
      })
  
      // Initialize events slider
      const eventsSlider = document.querySelector(".events-slider")
  
      if (eventsSlider) {
        const container = eventsSlider.querySelector(".slider-container")
        const prevBtn = eventsSlider.querySelector(".prev-btn")
        const nextBtn = eventsSlider.querySelector(".next-btn")
        const eventItems = container.querySelectorAll(".event-item")
  
        if (container && prevBtn && nextBtn && eventItems.length > 0) {
          let currentIndex = 0
          const itemCount = eventItems.length
  
          // Set initial position
          updateEventsSlider()
  
          // Event listeners for slider controls
          prevBtn.addEventListener("click", () => {
            currentIndex = (currentIndex - 1 + itemCount) % itemCount
            updateEventsSlider()
          })
  
          nextBtn.addEventListener("click", () => {
            currentIndex = (currentIndex + 1) % itemCount
            updateEventsSlider()
          })
  
          // Function to update slider position
          function updateEventsSlider() {
            const translateValue = -currentIndex * 100 + "%"
            container.style.transform = `translateX(${translateValue})`
  
            // Add active class to current item
            eventItems.forEach((item, index) => {
              if (index === currentIndex) {
                item.classList.add("active")
              } else {
                item.classList.remove("active")
              }
            })
          }
  
          // Add touch swipe functionality for mobile
          let touchStartX = 0
          let touchEndX = 0
  
          container.addEventListener("touchstart", (e) => {
            touchStartX = e.changedTouches[0].screenX
          })
  
          container.addEventListener("touchend", (e) => {
            touchEndX = e.changedTouches[0].screenX
            handleSwipe()
          })
  
          function handleSwipe() {
            const swipeThreshold = 50
            if (touchEndX < touchStartX - swipeThreshold) {
              // Swipe left - next slide
              nextBtn.click()
            } else if (touchEndX > touchStartX + swipeThreshold) {
              // Swipe right - previous slide
              prevBtn.click()
            }
          }
  
          // Auto-advance slides every 6 seconds
          let slideInterval = setInterval(() => {
            nextBtn.click()
          }, 6000)
  
          // Pause auto-advance on hover
          eventsSlider.addEventListener("mouseenter", () => {
            clearInterval(slideInterval)
          })
  
          eventsSlider.addEventListener("mouseleave", () => {
            slideInterval = setInterval(() => {
              nextBtn.click()
            }, 6000)
          })
        }
      }
    }
  })
  