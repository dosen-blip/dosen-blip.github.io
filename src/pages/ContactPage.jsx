import { useState } from "react"
import "../styles/contact.css"

const successMessage = "Thanks—your message has been sent."
const failureMessage = "Message could not be sent. Please try again or email matiadosen@outlook.com."
const defaultEndpoint = "https://formsubmit.co/ajax/matiadosen@outlook.com"

function Availability() {
  return (
    <div className="contact-availability">
      <span aria-hidden="true" />
      Available for Work
    </div>
  )
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="1" />
      <path d="m4 6 8 6.5L20 6" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".75" className="contact-icon-fill" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
      <path d="M8 10v7M8 7v.25M11.5 17v-7m0 3.15c.6-1.8 4.5-2.2 4.5 1.2V17" />
    </svg>
  )
}

function ContactDetails() {
  return (
    <div className="contact-details">
      <section className="contact-detail-group" aria-labelledby="contact-email-heading">
        <h3 id="contact-email-heading">Contact</h3>
        <div className="contact-detail-row">
          <EnvelopeIcon />
          <span>matiadosen@outlook.com</span>
        </div>
      </section>

      <section className="contact-detail-group" aria-labelledby="contact-social-heading">
        <h3 id="contact-social-heading">Social</h3>
        <div className="contact-social-list">
          <a className="contact-detail-row" href="https://www.instagram.com/matia_dosen/" target="_blank" rel="noreferrer">
            <InstagramIcon />
            <span>Instagram</span>
          </a>
          <a className="contact-detail-row" href="https://www.linkedin.com/in/matia-dosen-719090273" target="_blank" rel="noreferrer">
            <LinkedInIcon />
            <span>LinkedIn</span>
          </a>
        </div>
      </section>
    </div>
  )
}

function ContactForm() {
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT?.trim() || defaultEndpoint
  const [state, setState] = useState("idle")

  async function handleSubmit(event) {
    event.preventDefault()
    if (!endpoint || state === "submitting") return

    const form = event.currentTarget
    const formData = new FormData(form)
    formData.set("_replyto", formData.get("Email"))
    setState("submitting")

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      })
      if (!response.ok) throw new Error("Contact request failed")
      form.reset()
      setState("success")
    } catch {
      setState("failure")
    }
  }

  const statusMessage = state === "success"
    ? successMessage
    : state === "failure"
      ? failureMessage
      : ""

  return (
    <section className="contact-form-section" aria-labelledby="contact-form-heading">
      <h3 id="contact-form-heading">Get in Touch</h3>
      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="contact-form-row">
          <label>
            <span className="sr-only">Name</span>
            <input type="text" name="Name" placeholder="Name" required />
          </label>
          <label>
            <span className="sr-only">Email</span>
            <input type="email" name="Email" placeholder="Email" required />
          </label>
        </div>
        <label className="contact-message-field">
          <span className="sr-only">Message</span>
          <textarea name="Message" placeholder="Write a message..." required />
        </label>
        <input type="hidden" name="_subject" value="New portfolio contact" />
        <input type="hidden" name="_template" value="table" />
        <input className="contact-honeypot" type="text" name="_honey" tabIndex="-1" autoComplete="off" aria-hidden="true" />
        <button type="submit" disabled={state === "submitting"} aria-busy={state === "submitting"}>
          Send Message
        </button>
        {statusMessage && (
          <p className={`contact-form-status contact-form-status--${state}`} role="status" aria-live="polite">
            {statusMessage}
          </p>
        )}
      </form>
    </section>
  )
}

export default function ContactPage() {
  return (
    <div className="contact-page">
      <section className="contact-content" aria-labelledby="contact-heading">
        <Availability />
        <div className="contact-intro">
          <h1 id="contact-heading">Let&apos;s Connect!</h1>
          <p>Feel free to reach out with your projects, questions, or to connect. I&apos;ll respond promptly, and we can explore opportunities together.</p>
        </div>
        <div className="contact-main-grid">
          <ContactForm />
          <ContactDetails />
        </div>
      </section>
    </div>
  )
}
